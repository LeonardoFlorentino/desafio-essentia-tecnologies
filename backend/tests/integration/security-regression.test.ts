import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2/promise';
import request from 'supertest';
import { createApp } from '../../src/app';
import { config } from '../../src/config';
import { pool } from '../../src/db/mysql';
import { TaskDetailsModel } from '../../src/tasks/task-details';

// One place for the attacks this API must keep resisting. Each test sets up the attack, checks
// it fails, and checks nothing changed. Related coverage elsewhere: rate-limit.test.ts (429),
// security.test.ts (headers, 413, CORS), token-revocation.test.ts (logout), auth.test.ts.

const app = createApp();
const owner = request.agent(app);
const intruder = request.agent(app);
let ownerId: number;
let ownerTask: { id: number; title: string };

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  const res = await owner
    .post('/api/auth/register')
    .send({ email: 'owner@techx.com', password: 'owner-password' })
    .expect(201);
  ownerId = res.body.user.id;
  await intruder
    .post('/api/auth/register')
    .send({ email: 'intruder@techx.com', password: 'intruder-password' })
    .expect(201);

  ownerTask = (await owner.post('/api/tasks').send({ title: 'Private task' }).expect(201)).body;
  await owner
    .put(`/api/tasks/${ownerTask.id}/details`)
    .send({ notes: 'secret notes', tags: ['private'] })
    .expect(200);
});

afterAll(async () => {
  await pool.end();
});

describe("A01 — another user's task (IDOR)", () => {
  it.each([
    ['GET', ''],
    ['PATCH', ''],
    ['DELETE', ''],
    ['GET', '/details'],
    ['PUT', '/details'],
    ['GET', '/history'],
  ])('%s /api/tasks/:id%s answers 404, as if the task did not exist', async (method, path) => {
    const url = `/api/tasks/${ownerTask.id}${path}`;
    const res = await intruder[method.toLowerCase() as 'get'](url).send({
      title: 'hacked',
      completed: true,
      notes: 'hacked',
      tags: [],
    });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  it('leaves the task, its details and its history untouched after all those attempts', async () => {
    const task = await owner.get(`/api/tasks/${ownerTask.id}`).expect(200);
    expect(task.body).toMatchObject({ title: 'Private task', completed: false });

    const details = await owner.get(`/api/tasks/${ownerTask.id}/details`).expect(200);
    expect(details.body).toEqual({ notes: 'secret notes', tags: ['private'] });

    const history = await owner.get(`/api/tasks/${ownerTask.id}/history`).expect(200);
    expect(history.body.map((event: { type: string }) => event.type)).toEqual([
      'details_updated',
      'created',
    ]);
  });

  it("does not reach the owner's tasks through the list, the search or the filters", async () => {
    for (const query of ['', '?search=Private', '?status=pending', '?sort=priority']) {
      const res = await intruder.get(`/api/tasks${query}`).expect(200);
      expect(res.body.map((t: { title: string }) => t.title)).not.toContain('Private task');
    }
  });

  it('cannot create a task for someone else (owner fields in the body are ignored)', async () => {
    const res = await intruder
      .post('/api/tasks')
      .send({ title: 'Mine', userId: ownerId, user_id: ownerId, id: ownerTask.id })
      .expect(201);

    expect(res.body.id).not.toBe(ownerTask.id);
    const [rows] = await pool.query<RowDataPacket[]>('SELECT user_id FROM tasks WHERE id = ?', [
      res.body.id,
    ]);
    expect(rows[0]!['user_id']).not.toBe(ownerId);
  });
});

describe('A02/A07 — forged session tokens', () => {
  /**
   * A token exactly like the API's own; each test changes one thing to break it
   * (a claim set to undefined is left out of the token).
   */
  function forge(
    claims: Record<string, unknown> = {},
    secret = config.jwt.secret,
    algorithm: jwt.Algorithm = 'HS256',
  ) {
    const payload: Record<string, unknown> = {
      sub: String(ownerId),
      email: 'owner@techx.com',
      jti: randomUUID(),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...claims,
    };
    for (const key of Object.keys(payload)) if (payload[key] === undefined) delete payload[key];
    return jwt.sign(payload, secret, { algorithm });
  }

  const me = (token: string) => request(app).get('/api/auth/me').set('Cookie', `session=${token}`);

  it('control: a correctly forged token is accepted, so the cases below fail only for their defect', async () => {
    await me(forge()).expect(200);
  });

  it('rejects a payload changed after signing (another user id, same signature)', async () => {
    const [header, , signature] = forge().split('.');
    const payload = Buffer.from(
      JSON.stringify({ sub: '999', email: 'x', jti: randomUUID(), exp: 9999999999 }),
    ).toString('base64url');
    await me(`${header}.${payload}.${signature}`).expect(401);
  });

  it('rejects a token signed with another secret', async () => {
    await me(forge({}, 'another-secret-another-secret-0123456789')).expect(401);
  });

  it('rejects an expired token', async () => {
    await me(forge({ exp: Math.floor(Date.now() / 1000) - 60 })).expect(401);
  });

  it('rejects an unsigned token (alg: none)', async () => {
    const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString('base64url');
    const claims = { sub: String(ownerId), email: 'x', jti: randomUUID(), exp: 9999999999 };
    await me(`${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`).expect(401);
  });

  it('rejects another algorithm, even with the right secret (algorithm is pinned)', async () => {
    await me(forge({}, undefined, 'HS512')).expect(401);
  });

  it('rejects a token without an id (could never be revoked)', async () => {
    await me(forge({ jti: undefined })).expect(401);
  });

  it('rejects a revoked token', async () => {
    const token = forge();
    await request(app).post('/api/auth/logout').set('Cookie', `session=${token}`).expect(204);
    await me(token).expect(401);
  });
});

describe('A03 — injection', () => {
  const sqlPayloads = [
    "'; DROP TABLE tasks; --",
    "' OR '1'='1",
    '1; DELETE FROM users',
    "Robert'); DROP TABLE users;--",
  ];

  it.each(sqlPayloads)('stores the SQL payload %j as plain text', async (payload) => {
    const res = await owner
      .post('/api/tasks')
      .send({ title: payload, description: payload })
      .expect(201);

    const saved = await owner.get(`/api/tasks/${res.body.id}`).expect(200);
    expect(saved.body).toMatchObject({ title: payload, description: payload });
    const [tables] = await pool.query<RowDataPacket[]>("SHOW TABLES LIKE 'tasks'");
    expect(tables).toHaveLength(1);
  });

  it('finds nothing extra when the search is an injection attempt', async () => {
    const res = await intruder
      .get(`/api/tasks?search=${encodeURIComponent("' OR '1'='1")}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });

  it.each([
    ['sort', `?sort=${encodeURIComponent('created_at; DROP TABLE tasks')}`],
    ['order', `?order=${encodeURIComponent('desc, (SELECT SLEEP(5))')}`],
    ['status', `?status=${encodeURIComponent("all' OR '1'='1")}`],
  ])('refuses an injection in %s with 400 (only listed values are accepted)', async (_p, query) => {
    await owner.get(`/api/tasks${query}`).expect(400);
  });

  it.each(['1 OR 1=1', '1;DROP TABLE tasks', '0x1', '1e3'])(
    'refuses the task id %j with 400',
    async (id) => {
      await owner.get(`/api/tasks/${encodeURIComponent(id)}`).expect(400);
    },
  );

  it.each([
    ['an operator as notes', { notes: { $ne: null }, tags: [] }],
    ['an operator inside tags', { notes: '', tags: [{ $gt: '' }] }],
  ])('refuses %s in the MongoDB details with 400 (NoSQL injection)', async (_case, body) => {
    await owner.put(`/api/tasks/${ownerTask.id}/details`).send(body).expect(400);
  });

  it('drops unknown keys such as $set or userId before they reach MongoDB', async () => {
    await owner
      .put(`/api/tasks/${ownerTask.id}/details`)
      .send({ notes: 'ok', tags: [], $set: { userId: 999 }, userId: 999 })
      .expect(200);

    const doc = await TaskDetailsModel.findOne({ taskId: ownerTask.id }).lean();
    expect(doc).toMatchObject({ userId: ownerId, notes: 'ok' });
  });

  it('does not let a __proto__ key pollute objects', async () => {
    await owner
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send(
        '{"title":"proto","__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}',
      )
      .expect(201);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('returns an HTML/script payload as JSON text, never as a page', async () => {
    const xss = '<img src=x onerror=alert(1)><script>alert(1)</script>';
    const res = await owner.post('/api/tasks').send({ title: xss }).expect(201);

    expect(res.body.title).toBe(xss);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('A05 — errors do not leak internals', () => {
  afterEach(() => jest.restoreAllMocks());

  // What goes to the server log instead (and what is redacted there): logging.test.ts.
  it('answers a database failure with a generic 500 and only a request id to quote', async () => {
    const internal = Object.assign(
      new Error("ER_NO_SUCH_TABLE: Table 'todo.tasks' doesn't exist"),
      { sql: 'SELECT id, title FROM tasks WHERE user_id = 1' },
    );
    jest.spyOn(pool, 'query').mockRejectedValueOnce(internal as never);

    const res = await owner.get('/api/tasks').expect(500);

    expect(res.body).toEqual({
      error: 'Internal server error',
      requestId: res.headers['x-request-id'],
    });
    expect(res.text).not.toMatch(/ER_NO_SUCH_TABLE|SELECT|todo\.tasks|at .*\.ts/);
  });
});
