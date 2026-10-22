import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { authRouter } from './auth/auth.routes';
import { config } from './config';
import { pingMongo } from './db/mongo';
import { pool } from './db/mysql';
import { docsRouter } from './http/docs';
import { errorHandler, notFoundHandler } from './http/errors';
import { taskRouter } from './tasks/task.routes';

export function createApp() {
  const app = express();
  // credentials: the session cookie must travel on cross-origin calls.
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Both databases are checked in parallel; either one down makes the API unhealthy (503).
  app.get('/api/health', async (_req, res) => {
    const [mysql, mongo] = await Promise.allSettled([pool.query('SELECT 1'), pingMongo()]);
    const state = (result: PromiseSettledResult<unknown>) =>
      result.status === 'fulfilled' ? 'ok' : 'unavailable';
    const healthy = mysql.status === 'fulfilled' && mongo.status === 'fulfilled';
    res
      .status(healthy ? 200 : 503)
      .json({ status: healthy ? 'ok' : 'error', mysql: state(mysql), mongo: state(mongo) });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api', docsRouter);

  // Must come after every route.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
