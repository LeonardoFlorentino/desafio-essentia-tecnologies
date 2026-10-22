import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { NextFunction, Request, Response } from 'express';
import { issueToken } from '../../src/auth/auth.service';
import * as revokedTokens from '../../src/auth/revoked-tokens';
import { endSession, requireAuth, startSession } from '../../src/auth/session';
import { HttpError } from '../../src/http/errors';

jest.mock('../../src/auth/revoked-tokens');
const revoked = jest.mocked(revokedTokens);

const user = { id: 7, email: 'ana@techx.com' };

function fakeRequest(cookies: Record<string, string> = {}) {
  return { cookies, log: { info: jest.fn() } } as unknown as Request;
}

function fakeResponse() {
  return { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response & {
    cookie: jest.Mock;
    clearCookie: jest.Mock;
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  revoked.isRevoked.mockResolvedValue(false);
});

describe('requireAuth', () => {
  async function run(req: Request) {
    const next = jest.fn() as unknown as NextFunction & jest.Mock;
    await requireAuth(req, fakeResponse(), next);
    return next;
  }

  it('puts the user on the request and continues for a valid session', async () => {
    const req = fakeRequest({ session: issueToken(user) });
    const next = await run(req);

    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ['no cookie', {}],
    ['an invalid token', { session: 'not-a-token' }],
  ])('throws 401 with %s, without asking the database', async (_case, cookies) => {
    await expect(run(fakeRequest(cookies))).rejects.toEqual(
      new HttpError(401, 'Authentication required'),
    );
    expect(revoked.isRevoked).not.toHaveBeenCalled();
  });

  it('throws 401 for a revoked token', async () => {
    revoked.isRevoked.mockResolvedValue(true);
    await expect(run(fakeRequest({ session: issueToken(user) }))).rejects.toThrow(
      'Authentication required',
    );
  });
});

describe('startSession', () => {
  it('sets an HttpOnly, SameSite=Strict cookie on /api that lives as long as the token', () => {
    const res = fakeResponse();
    startSession(res, user);

    const [name, token, options] = res.cookie.mock.calls[0] as [string, string, object];
    expect(name).toBe('session');
    expect(token.split('.')).toHaveLength(3);
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'strict', path: '/api' });
    // JWT_EXPIRES_IN=1h in the unit setup.
    expect((options as { maxAge: number }).maxAge).toBeGreaterThan(59 * 60 * 1000);
  });
});

describe('endSession', () => {
  it('revokes the token until its expiry and clears the cookie', async () => {
    const res = fakeResponse();
    await endSession(fakeRequest({ session: issueToken(user) }), res);

    expect(revoked.revoke).toHaveBeenCalledWith(expect.any(String), expect.any(Date));
    expect(res.clearCookie).toHaveBeenCalledWith(
      'session',
      expect.objectContaining({ path: '/api' }),
    );
  });

  it('only clears the cookie when there is no valid session', async () => {
    const res = fakeResponse();
    await endSession(fakeRequest(), res);

    expect(revoked.revoke).not.toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalled();
  });
});
