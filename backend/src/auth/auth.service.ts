import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { Credentials } from './auth.schemas';
import * as userRepository from './user.repository';
import type { User } from './user.repository';

const BCRYPT_ROUNDS = 12;

// Compared against when the email is unknown, so a login takes the same time whether or not the
// account exists — timing must not reveal which emails are registered.
const UNKNOWN_USER_HASH = bcrypt.hashSync('no-such-user', BCRYPT_ROUNDS);

/** Returns null when the email is already registered. */
export async function register({ email, password }: Credentials): Promise<User | null> {
  return userRepository.create(email, await bcrypt.hash(password, BCRYPT_ROUNDS));
}

/** Returns the user only when the email exists and the password matches. */
export async function authenticate({ email, password }: Credentials): Promise<User | null> {
  const user = await userRepository.findByEmail(email);
  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? UNKNOWN_USER_HASH);
  return user && passwordMatches ? { id: user.id, email: user.email } : null;
}

/** What a valid token says: who it belongs to, its unique id and when it expires. */
export interface TokenClaims {
  user: User;
  jti: string;
  expiresAt: Date;
}

export function issueToken(user: User): string {
  return jwt.sign({ email: user.email }, config.jwt.secret, {
    algorithm: 'HS256',
    subject: String(user.id),
    // Unique id: lets this one token be revoked on logout without touching the user's others.
    jwtid: randomUUID(),
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Returns null for a missing, expired, tampered or otherwise invalid token — including one
 * without an id (issued before revocation existed), since it could never be revoked.
 * Does not check revocation: that needs the database (see session.ts).
 */
export function verifyToken(token: string): TokenClaims | null {
  try {
    // Pinning the algorithm rejects tokens signed with anything else (including "none").
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub || !payload.jti || !payload.exp) return null;
    return {
      user: { id: Number(payload.sub), email: String(payload['email']) },
      jti: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
    };
  } catch {
    return null;
  }
}
