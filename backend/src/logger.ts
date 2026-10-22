import pino, { type DestinationStream } from 'pino';
import { config } from './config';

/**
 * Never written to the logs, wherever they show up: credentials, the session, and the SQL of
 * mysql2 errors (it carries the query parameters — emails, password hashes, notes).
 */
export const REDACTED_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  'err.sql',
  'err.sqlMessage',
];

/** JSON lines on stdout (`npm run dev` pipes them through pino-pretty to make them readable). */
export function createLogger(destination?: DestinationStream) {
  return pino(
    {
      level: config.logLevel,
      redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
    },
    destination,
  );
}

export type Logger = ReturnType<typeof createLogger>;

export const logger = createLogger();
