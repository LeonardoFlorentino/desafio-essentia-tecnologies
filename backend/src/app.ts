import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { authRouter } from './auth/auth.routes';
import { authRateLimits } from './auth/rate-limit';
import { config } from './config';
import { pingMongo } from './db/mongo';
import { pool } from './db/mysql';
import { docsRouter } from './http/docs';
import { errorHandler, notFoundHandler } from './http/errors';
import { taskRouter } from './tasks/task.routes';

/** Largest JSON body accepted (the biggest valid one, 10,000 characters of notes, is far below it). */
export const BODY_LIMIT = '100kb';

export function createApp({
  authAttemptsPerMinute = config.authAttemptsPerMinute,
  trustProxy = config.trustProxy,
} = {}) {
  const app = express();
  // Do not advertise the framework (helmet removes it too; this keeps it off even without helmet).
  app.disable('x-powered-by');
  // Behind nginx, req.ip must be the browser's address (from X-Forwarded-For), not nginx's —
  // otherwise every user would share one rate limit.
  app.set('trust proxy', trustProxy);
  // The API only answers JSON, so its responses may load nothing at all and never be framed.
  // The docs page (/api/docs) sets its own, looser policy in docs.ts.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      // Same rule as frame-ancestors, for browsers that only know the older header.
      frameguard: { action: 'deny' },
    }),
  );
  // Only the configured origin may call the API from a browser; credentials: the session cookie
  // must travel on those calls.
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: BODY_LIMIT }));
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

  const limits = authRateLimits(authAttemptsPerMinute);
  app.use('/api/auth/login', limits.login);
  app.use('/api/auth/register', limits.register);
  app.use('/api/auth', authRouter);
  app.use('/api/tasks', taskRouter);
  app.use('/api', docsRouter);

  // Must come after every route.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
