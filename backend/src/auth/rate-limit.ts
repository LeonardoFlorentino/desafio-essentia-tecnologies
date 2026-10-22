import type { NextFunction, Request, Response } from 'express';
import { rateLimit, type Options } from 'express-rate-limit';

const ONE_MINUTE = 60 * 1000;

/**
 * Limits for the endpoints that brute force targets, per client IP and per minute:
 * - login counts only failed attempts, so someone who types the password right is never blocked;
 * - register counts every call, to slow down mass account creation.
 * Each app gets its own in-memory counters.
 */
export function authRateLimits(attemptsPerMinute: number) {
  const options = {
    windowMs: ONE_MINUTE,
    limit: attemptsPerMinute,
    // RateLimit-* headers (IETF draft) and Retry-After tell the client when to try again.
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again in a minute.' },
    // A blocked client is a security event worth seeing in the logs (likely brute force).
    handler: (req: Request, res: Response, _next: NextFunction, options: Options) => {
      req.log.warn({ event: 'auth.rate_limited', path: req.originalUrl }, 'too many attempts');
      res.status(options.statusCode).json(options.message);
    },
  } as const;
  return {
    login: rateLimit({ ...options, skipSuccessfulRequests: true }),
    register: rateLimit(options),
  };
}
