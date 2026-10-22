import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app';
import { pool } from '../../src/db/mysql';

const account = { email: 'owner@techx.com', password: 'owner-password' };
const wrong = { email: account.email, password: 'wrong-password' };
const tooMany = { error: 'Too many attempts. Try again in a minute.' };

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  await request(createApp()).post('/api/auth/register').send(account).expect(201);
});

afterAll(async () => {
  await pool.end();
});

/** A fresh app (fresh counters) with the production limit of 5 per minute. */
const limitedApp = (trustProxy = 0) => createApp({ authAttemptsPerMinute: 5, trustProxy });

describe('login rate limit', () => {
  it('answers 429 on the 6th failed attempt in a row, and says when to try again', async () => {
    const app = limitedApp();
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send(wrong).expect(401);
    }

    const res = await request(app).post('/api/auth/login').send(wrong).expect(429);
    expect(res.body).toEqual(tooMany);
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
    expect(res.headers['ratelimit-policy']).toContain('q=5');
  });

  it('blocks the right password too once the limit is reached (no guessing during the block)', async () => {
    const app = limitedApp();
    for (let i = 0; i < 5; i++) await request(app).post('/api/auth/login').send(wrong);

    const res = await request(app).post('/api/auth/login').send(account).expect(429);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('does not count successful logins', async () => {
    const app = limitedApp();
    for (let i = 0; i < 8; i++) {
      await request(app).post('/api/auth/login').send(account).expect(200);
    }
  });

  it('counts each client separately behind the proxy (X-Forwarded-For)', async () => {
    const app = limitedApp(1);
    const from = (ip: string) =>
      request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send(wrong);
    for (let i = 0; i < 5; i++) await from('203.0.113.1');

    expect((await from('203.0.113.1')).status).toBe(429);
    expect((await from('203.0.113.2')).status).toBe(401);
  });

  it('ignores a forged X-Forwarded-For when there is no proxy', async () => {
    const app = limitedApp(0);
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', `198.51.100.${i}`)
        .send(wrong);
    }
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Forwarded-For', '198.51.100.99')
      .send(wrong);
    expect(res.status).toBe(429);
  });
});

describe('register rate limit', () => {
  it('answers 429 on the 6th sign-up in a minute', async () => {
    const app = limitedApp();
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/register')
        .send({ email: `user${i}@techx.com`, password: 'a-good-password' })
        .expect(201);
    }

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user5@techx.com', password: 'a-good-password' })
      .expect(429);
    expect(res.body).toEqual(tooMany);
  });
});

describe('other routes', () => {
  it('are not limited', async () => {
    const app = limitedApp();
    for (let i = 0; i < 8; i++) await request(app).get('/api/auth/me').expect(401);
    await request(app).get('/api/health').expect(200);
  });
});
