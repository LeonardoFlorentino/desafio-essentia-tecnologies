import { Router, type RequestHandler } from 'express';
import { pingMongo } from '../db/mongo';
import { pool } from '../db/mysql';

export const healthRouter = Router();

// Liveness: the process is up and answering. It never touches the databases, so a database
// outage does not make an orchestrator restart an API that would recover by itself.
healthRouter.get('/live', (_req, res) => {
  res.json({ status: 'ok' });
});

// Readiness: both databases answer, so the API can serve requests. Checked in parallel; either
// one down → 503, naming which.
const readiness: RequestHandler = async (_req, res) => {
  const [mysql, mongo] = await Promise.allSettled([pool.query('SELECT 1'), pingMongo()]);
  const state = (result: PromiseSettledResult<unknown>) =>
    result.status === 'fulfilled' ? 'ok' : 'unavailable';
  const ready = mysql.status === 'fulfilled' && mongo.status === 'fulfilled';
  res
    .status(ready ? 200 : 503)
    .json({ status: ready ? 'ok' : 'error', mysql: state(mysql), mongo: state(mongo) });
};

healthRouter.get('/ready', readiness);
// The original address (/api/health) keeps answering the readiness check.
healthRouter.get('/', readiness);
