import cors from 'cors';
import express from 'express';
import { config } from './config';
import { pool } from './db/mysql';
import { errorHandler, notFoundHandler } from './http/errors';
import { taskRouter } from './tasks/task.routes';

export function createApp() {
  const app = express();
  // credentials: the session cookie (from the authentication steps) must travel on cross-origin calls.
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());

  app.get('/api/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  app.use('/api/tasks', taskRouter);

  // Must come after every route.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
