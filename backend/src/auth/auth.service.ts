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

export function issueToken(user: User): string {
  return jwt.sign({ email: user.email }, config.jwt.secret, {
    algorithm: 'HS256',
    subject: String(user.id),
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

/** Returns null for a missing, expired, tampered or otherwise invalid token. */
export function verifyToken(token: string): User | null {
  try {
    // Pinning the algorithm rejects tokens signed with anything else (including "none").
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || !payload.sub) return null;
    return { id: Number(payload.sub), email: String(payload['email']) };
  } catch {
    return null;
  }
}
