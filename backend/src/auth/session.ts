import type { CookieOptions, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { HttpError } from '../http/errors';
import { issueToken, verifyToken } from './auth.service';
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

export function endSession(res: Response) {
  res.clearCookie(SESSION_COOKIE, cookieOptions);
}

/** Lets the request through only with a valid session cookie; the user goes to `req.user`. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  const user = typeof token === 'string' ? verifyToken(token) : null;
  if (!user) throw new HttpError(401, 'Authentication required');
  req.user = user;
  next();
};
