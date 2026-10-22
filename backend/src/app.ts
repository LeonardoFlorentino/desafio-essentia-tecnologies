import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Request } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { authRouter } from './auth/auth.routes';
import { authRateLimits } from './auth/rate-limit';
import { config } from './config';
import { docsRouter } from './http/docs';
import { errorHandler, notFoundHandler } from './http/errors';
import { healthRouter } from './http/health';
import { logger } from './logger';
import { taskRouter } from './tasks/task.routes';

/** Largest JSON body accepted (the biggest valid one, 10,000 characters of notes, is far below it). */
export const BODY_LIMIT = '100kb';

/** An X-Request-Id sent by a proxy or client is reused only when it looks like an id. */
const REQUEST_ID = /^[\w-]{1,64}$/;

export function createApp({
  authAttemptsPerMinute = config.authAttemptsPerMinute,
  trustProxy = config.trustProxy,
  logger: appLogger = logger,
} = {}) {
  const app = express();
  // Do not advertise the framework (helmet removes it too; this keeps it off even without helmet).
  app.disable('x-powered-by');
  // Behind nginx, req.ip must be the browser's address (from X-Forwarded-For), not nginx's —
  // otherwise every user would share one rate limit.
  app.set('trust proxy', trustProxy);

  // One JSON line per request, tagged with an id that also goes back in X-Request-Id: a user
  // reporting an error can quote it, and it finds every log line of that request.
  app.use(
    pinoHttp({
      logger: appLogger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id =
          typeof incoming === 'string' && REQUEST_ID.test(incoming) ? incoming : randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      // Docker checks the health every few seconds: those would drown everything else.
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/health') ?? false },
      customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? 'error' : 'info'),
      // Only what helps to follow a request; headers (cookie!) and bodies stay out.
      serializers: {
        req: (req: { id: string; method: string; url: string; raw: Request }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          ip: req.raw.ip,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
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

  app.use('/api/health', healthRouter);

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
