import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, issueToken, register, verifyToken } from '../../src/auth/auth.service';
import * as userRepository from '../../src/auth/user.repository';

jest.mock('../../src/auth/user.repository');
const repo = jest.mocked(userRepository);

const user = { id: 7, email: 'ana@techx.com' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('register', () => {
  it('stores a bcrypt hash (cost 12), never the password itself', async () => {
    repo.create.mockResolvedValue(user);

    await expect(register({ email: user.email, password: 'correct-horse' })).resolves.toEqual(user);

    const [, hash] = repo.create.mock.calls[0]!;
    expect(hash).not.toContain('correct-horse');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    await expect(bcrypt.compare('correct-horse', hash)).resolves.toBe(true);
  });

  it('passes on "email already registered" (null) from the repository', async () => {
    repo.create.mockResolvedValue(null);
    await expect(register({ email: user.email, password: 'correct-horse' })).resolves.toBeNull();
  });
});

describe('authenticate', () => {
  const stored = async (password: string) => ({
    ...user,
    passwordHash: await bcrypt.hash(password, 4),
  });

  it('returns the public user (no hash) for the right password', async () => {
    repo.findByEmail.mockResolvedValue(await stored('correct-horse'));
    await expect(authenticate({ email: user.email, password: 'correct-horse' })).resolves.toEqual(
      user,
    );
  });

  it('returns null for a wrong password', async () => {
    repo.findByEmail.mockResolvedValue(await stored('correct-horse'));
    await expect(authenticate({ email: user.email, password: 'wrong' })).resolves.toBeNull();
  });

  it('still runs a bcrypt comparison for an unknown email (same time, nothing revealed)', async () => {
    repo.findByEmail.mockResolvedValue(null);
    const compare = jest.spyOn(bcrypt, 'compare');

    await expect(authenticate({ email: 'nobody@techx.com', password: 'x' })).resolves.toBeNull();
    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare.mock.calls[0]![1]).toMatch(/^\$2[aby]\$12\$/);
  });
});

describe('issueToken and verifyToken', () => {
  it('round-trips the user, with a unique id and the configured expiry', () => {
    const token = issueToken(user);
    const claims = verifyToken(token)!;

    expect(claims.user).toEqual(user);
    expect(claims.jti).toMatch(/^[0-9a-f-]{36}$/);
    expect(verifyToken(issueToken(user))!.jti).not.toBe(claims.jti);
    // JWT_EXPIRES_IN=1h in the unit setup.
    expect(claims.expiresAt.getTime() - Date.now()).toBeGreaterThan(59 * 60 * 1000);
    expect(claims.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it('signs with HS256', () => {
    expect(jwt.decode(issueToken(user), { complete: true })!.header.alg).toBe('HS256');
  });

  it.each([
    ['garbage', 'not-a-token'],
    ['a token without an id', jwt.sign({ email: 'x' }, process.env.JWT_SECRET!, { subject: '1' })],
    ['a token without a subject', jwt.sign({ email: 'x', jti: 'a' }, process.env.JWT_SECRET!)],
  ])('returns null for %s', (_case, token) => {
    expect(verifyToken(token)).toBeNull();
  });
});
