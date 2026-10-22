import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Writable } from 'node:stream';
import request from 'supertest';
import { createApp } from '../../src/app';
import { disconnectMongo, connectMongo } from '../../src/db/mongo';
import { pool } from '../../src/db/mysql';
import { createLogger } from '../../src/logger';

/** Every JSON line the app logs, parsed. */
let lines: Record<string, unknown>[] = [];
const sink = new Writable({
  write(chunk, _encoding, done) {
    for (const line of String(chunk).split('\n').filter(Boolean)) lines.push(JSON.parse(line));
    done();
  },
});

let app: ReturnType<typeof createApp>;
const credentials = { email: 'owner@techx.com', password: 'owner-password' };

beforeAll(async () => {
  // The tests run with LOG_LEVEL=silent (setup-env.ts); this logger writes at the production level.
  const logger = createLogger(sink);
  logger.level = 'info';
  app = createApp({ logger, authAttemptsPerMinute: 2 });
  await pool.query('DELETE FROM users');
  await request(app).post('/api/auth/register').send(credentials).expect(201);
});

beforeEach(() => {
  lines = [];
});

afterAll(async () => {
  await pool.end();
});

const logged = () => JSON.stringify(lines);

describe('request logs', () => {
  it('writes one JSON line per request with its id, method, url and status', async () => {
    const res = await request(app).get('/api/tasks').expect(401);
    const id = res.headers['x-request-id'];

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const line = lines.find((l) => (l['req'] as { id?: string })?.id === id);
    expect(line).toMatchObject({
      level: 30,
      msg: 'request completed',
      req: { id, method: 'GET', url: '/api/tasks' },
      res: { statusCode: 401 },
    });
  });

  it('reuses a well-formed X-Request-Id from a proxy, and replaces a malformed one', async () => {
    const reused = await request(app).get('/api/auth/me').set('X-Request-Id', 'abc-123');
    expect(reused.headers['x-request-id']).toBe('abc-123');

    for (const malformed of ['fake id" "level":60', 'x'.repeat(65)]) {
      const replaced = await request(app).get('/api/auth/me').set('X-Request-Id', malformed);
      expect(replaced.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('skips the health checks (Docker polls them every few seconds)', async () => {
    await request(app).get('/api/health/live').expect(200);
    await request(app).get('/api/health/ready').expect(200);
    expect(lines).toEqual([]);
  });
});

describe('nothing secret reaches the logs', () => {
  it('leaves out passwords, the session cookie and the token', async () => {
    const login = await request(app).post('/api/auth/login').send(credentials).expect(200);
    const cookie = ([] as string[]).concat(login.headers['set-cookie'] ?? [])[0]!.split(';')[0]!;
    await request(app)
      .get('/api/tasks')
      .set('Cookie', cookie)
      .set('Authorization', 'Bearer abc')
      .expect(200);

    expect(lines.length).toBeGreaterThan(0);
    expect(logged()).not.toContain(credentials.password);
    expect(logged()).not.toContain(cookie.split('=')[1]);
    expect(logged()).not.toMatch(/cookie|authorization|Bearer/i);
  });

  describe('an unexpected error', () => {
    afterEach(() => jest.restoreAllMocks());

    it('is logged with its request id and message, but the SQL is redacted', async () => {
      const internal = Object.assign(new Error("Duplicate entry 'ana@techx.com' for key 'email'"), {
        sql: "INSERT INTO users (email, password_hash) VALUES ('ana@techx.com', '$2b$12$hash')",
        sqlMessage: "Duplicate entry 'ana@techx.com' for key 'email'",
      });
      const agent = request.agent(app);
      await agent.post('/api/auth/login').send(credentials).expect(200);
      jest.spyOn(pool, 'query').mockRejectedValueOnce(internal as never);

      const res = await agent.get('/api/tasks').expect(500);

      const error = lines.find((l) => l['msg'] === 'unhandled error');
      expect(error).toMatchObject({
        level: 50,
        req: { id: res.body.requestId },
        err: { sql: '[redacted]', sqlMessage: '[redacted]' },
      });
      expect(logged()).not.toContain('$2b$12$hash');
    });
  });
});

describe('security events', () => {
  const events = () => lines.map((l) => l['event']).filter(Boolean);

  it('records sign-in, failed sign-in and sign-out, without the email typed', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'someone@techx.com', password: 'wrong-password' })
      .expect(401);
    const login = await request(app).post('/api/auth/login').send(credentials).expect(200);
    const cookie = ([] as string[]).concat(login.headers['set-cookie'] ?? [])[0]!.split(';')[0]!;
    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);

    expect(events()).toEqual(['auth.login_failed', 'auth.login', 'auth.logout']);
    const failed = lines.find((l) => l['event'] === 'auth.login_failed')!;
    expect(failed['level']).toBe(40);
    expect(logged()).not.toContain('someone@techx.com');
  });

  it('records a client blocked by the rate limit', async () => {
    const wrong = { email: credentials.email, password: 'wrong-password' };
    for (let i = 0; i < 3; i++) await request(app).post('/api/auth/login').send(wrong);

    expect(events()).toContain('auth.rate_limited');
  });
});

describe('health probes', () => {
  it('live stays 200 and ready turns 503 when MongoDB is down', async () => {
    await disconnectMongo();
    try {
      await request(app).get('/api/health/live').expect(200, { status: 'ok' });
      const ready = await request(app).get('/api/health/ready').expect(503);
      expect(ready.body).toEqual({ status: 'error', mysql: 'ok', mongo: 'unavailable' });
    } finally {
      await connectMongo();
    }
    await request(app).get('/api/health/ready').expect(200);
  });
});
