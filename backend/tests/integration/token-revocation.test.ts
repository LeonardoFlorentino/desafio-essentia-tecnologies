import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2/promise';
import request from 'supertest';
import { createApp } from '../../src/app';
import { purgeExpired, revoke } from '../../src/auth/revoked-tokens';
import { config } from '../../src/config';
import { pool } from '../../src/db/mysql';

const app = createApp();
const credentials = { email: 'owner@techx.com', password: 'owner-password' };

/** Logs in and returns the raw `session=<jwt>` cookie, as someone copying it would. */
async function login(): Promise<string> {
  const res = await request(app).post('/api/auth/login').send(credentials).expect(200);
  const cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? [])[0]!;
  return cookie.split(';')[0]!;
}

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  await request(app).post('/api/auth/register').send(credentials).expect(201);
});

beforeEach(async () => {
  await pool.query('DELETE FROM revoked_tokens');
});

afterAll(async () => {
  await pool.end();
});

describe('logout revokes the token on the server', () => {
  it('a copy of the token stops working right after logout', async () => {
    const session = await login();
    await request(app).get('/api/tasks').set('Cookie', session).expect(200);

    await request(app).post('/api/auth/logout').set('Cookie', session).expect(204);

    await request(app).get('/api/tasks').set('Cookie', session).expect(401);
    await request(app).get('/api/auth/me').set('Cookie', session).expect(401);
  });

  it('stores the token id until the moment the token would expire', async () => {
    const session = await login();
    const { jti, exp } = jwt.decode(session.replace('session=', '')) as jwt.JwtPayload;

    await request(app).post('/api/auth/logout').set('Cookie', session).expect(204);

    const [rows] = await pool.query<RowDataPacket[]>('SELECT jti, expires_at FROM revoked_tokens');
    expect(rows).toHaveLength(1);
    expect(rows[0]!['jti']).toBe(jti);
    expect((rows[0]!['expires_at'] as Date).getTime()).toBe(exp! * 1000);
  });

  it("ends only that session: the user's other sessions keep working", async () => {
    const laptop = await login();
    const phone = await login();
    expect(laptop).not.toBe(phone);

    await request(app).post('/api/auth/logout').set('Cookie', laptop).expect(204);

    await request(app).get('/api/auth/me').set('Cookie', laptop).expect(401);
    await request(app).get('/api/auth/me').set('Cookie', phone).expect(200);
  });

  it('logging out twice, or with no session at all, still answers 204', async () => {
    const session = await login();
    await request(app).post('/api/auth/logout').set('Cookie', session).expect(204);
    await request(app).post('/api/auth/logout').set('Cookie', session).expect(204);
    await request(app).post('/api/auth/logout').expect(204);
  });

  it('rejects a token without an id, which could never be revoked', async () => {
    const legacy = jwt.sign({ email: credentials.email }, config.jwt.secret, {
      algorithm: 'HS256',
      subject: '1',
      expiresIn: '1h',
    });
    await request(app).get('/api/auth/me').set('Cookie', `session=${legacy}`).expect(401);
  });
});

describe('cleanup of expired revocations', () => {
  it('removes only the rows whose token has already expired', async () => {
    const hour = 60 * 60 * 1000;
    await revoke('00000000-0000-4000-8000-000000000001', new Date(Date.now() - hour));
    await revoke('00000000-0000-4000-8000-000000000002', new Date(Date.now() + hour));

    expect(await purgeExpired()).toBe(1);
    const [rows] = await pool.query<RowDataPacket[]>('SELECT jti FROM revoked_tokens');
    expect(rows.map((row) => row['jti'])).toEqual(['00000000-0000-4000-8000-000000000002']);
  });
});
