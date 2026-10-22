import { rateLimit } from 'express-rate-limit';

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
  } as const;
  return {
    login: rateLimit({ ...options, skipSuccessfulRequests: true }),
    register: rateLimit(options),
  };
}
