import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../http/errors';
import { issueToken, verifyToken } from './auth.service';
import * as revokedTokens from './revoked-tokens';
import type { User } from './user.repository';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by requireAuth for authenticated requests. */
    user?: User;
  }
}

const SESSION_COOKIE = 'session';

// HttpOnly: page scripts cannot read the token, so an XSS cannot steal the session.
// SameSite=Strict: the browser does not send it on requests started by other sites (CSRF).
const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: config.secureCookies,
  path: '/api',
};

/** Signs a token for the user and stores it in the session cookie, for as long as the token lives. */
export function startSession(res: Response, user: User) {
  const token = issueToken(user);
  const { exp } = jwt.decode(token) as jwt.JwtPayload;
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: exp! * 1000 - Date.now() });
}

/** The session token's claims, if the request carries a validly signed, unexpired one. */
function sessionClaims(req: Request) {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  return typeof token === 'string' ? verifyToken(token) : null;
}

/**
 * Logs out on the server too: the token is revoked, so a copy of it (stolen, or kept by a
 * script) stops working right away instead of living until it expires. Then the cookie goes.
 */
export async function endSession(req: Request, res: Response) {
  const claims = sessionClaims(req);
  if (claims) await revokedTokens.revoke(claims.jti, claims.expiresAt);
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** Lets the request through only with a valid, not revoked session; the user goes to `req.user`. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const claims = sessionClaims(req);
  if (!claims || (await revokedTokens.isRevoked(claims.jti))) {
    throw new HttpError(401, 'Authentication required');
  }
  req.user = claims.user;
  next();
};
