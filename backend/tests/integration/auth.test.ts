import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../../src/app';
import { config } from '../../src/config';
import { pool } from '../../src/db/mysql';

const app = createApp();
const credentials = { email: 'ana@techx.com', password: 'correct-horse-battery' };

beforeEach(async () => {
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

function sessionCookie(res: request.Response): string | undefined {
  const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? []);
  return cookies.find((cookie) => cookie.startsWith('session='));
}

async function register(body: object = credentials) {
  return request(app).post('/api/auth/register').send(body);
}

describe('POST /api/auth/register', () => {
  it('creates the account, answers 201 without the password and starts a session', async () => {
    const res = await register({ email: '  Ana@TechX.com ', password: credentials.password });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ user: { id: expect.any(Number), email: 'ana@techx.com' } });
    expect(JSON.stringify(res.body)).not.toContain(credentials.password);

    const cookie = sessionCookie(res)!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api/i);
  });

  it('stores only a bcrypt hash of the password', async () => {
    await register();
    const [rows] = await pool.query('SELECT password_hash FROM users');
    const hash = (rows as { password_hash: string }[])[0].password_hash;

    expect(hash).not.toContain(credentials.password);
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('refuses an email that is already registered with 409', async () => {
    await register();
    const res = await register({ ...credentials, email: 'ANA@techx.com' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Email already registered' });
  });

  it.each([
    [
      'an invalid email',
      { email: 'not-an-email', password: 'long-enough' },
      'email',
      'Email is invalid',
    ],
    ['a missing email', { password: 'long-enough' }, 'email', 'Email is required'],
    [
      'a short password',
      { email: 'a@b.com', password: 'short' },
      'password',
      'Password must be at least 8 characters',
    ],
    [
      'a password over 72 bytes',
      { email: 'a@b.com', password: 'é'.repeat(37) },
      'password',
      'Password must be at most 72 bytes',
    ],
  ])('rejects %s with 400', async (_case, body, field, message) => {
    const res = await register(body);

    expect(res.status).toBe(400);
    expect(res.body.details[field]).toEqual([message]);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('signs in with the right password and starts a session', async () => {
    const res = await request(app).post('/api/auth/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(credentials.email);
    expect(sessionCookie(res)).toMatch(/HttpOnly/i);
  });

  it('accepts the email in any case and with spaces around it', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: ' ANA@techx.com ', password: credentials.password });
    expect(res.status).toBe(200);
  });

  it.each([
    ['a wrong password', { email: credentials.email, password: 'wrong-password' }],
    ['an unknown email', { email: 'nobody@techx.com', password: credentials.password }],
  ])('answers 401 with the same message for %s', async (_case, body) => {
    const res = await request(app).post('/api/auth/login').send(body);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid email or password' });
    expect(sessionCookie(res)).toBeUndefined();
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(credentials).expect(201);

    const res = await agent.get('/api/auth/me').expect(200);
    expect(res.body).toEqual({ user: { id: expect.any(Number), email: credentials.email } });
  });

  it('answers 401 without a session', async () => {
    const res = await request(app).get('/api/auth/me').expect(401);
    expect(res.body).toEqual({ error: 'Authentication required' });
  });

  it.each([
    ['a tampered token', () => `${jwt.sign({ email: 'x' }, config.jwt.secret, { subject: '1' })}x`],
    [
      'a token signed with another secret',
      () => jwt.sign({ email: 'x' }, 'another-secret-another-secret-123', { subject: '1' }),
    ],
    [
      'an expired token',
      () =>
        jwt.sign({ email: 'x', exp: Math.floor(Date.now() / 1000) - 60 }, config.jwt.secret, {
          subject: '1',
        }),
    ],
    [
      'an unsigned token (alg none)',
      () =>
        `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"sub":"1","email":"x"}').toString('base64url')}.`,
    ],
  ])('answers 401 for %s', async (_case, makeToken) => {
    await request(app).get('/api/auth/me').set('Cookie', `session=${makeToken()}`).expect(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the session cookie', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(credentials).expect(201);

    const res = await agent.post('/api/auth/logout').expect(204);
    expect(sessionCookie(res)).toMatch(/session=;/);
    expect(sessionCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);

    await agent.get('/api/auth/me').expect(401);
  });
});

describe('task routes', () => {
  it('are still public until they require a session', async () => {
    await request(app).get('/api/tasks').expect(200);
  });
});
