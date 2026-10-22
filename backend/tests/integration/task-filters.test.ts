import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app';
import { pool } from '../../src/db/mysql';

const app = createApp();
const owner = request.agent(app);

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  await owner
    .post('/api/auth/register')
    .send({ email: 'owner@techx.com', password: 'owner-password' });
});

afterAll(async () => {
  await pool.end();
});

/** Creates tasks one second apart in created_at, so the default order is predictable. */
async function seedTasks() {
  const tasks = [
    { title: 'Pay the electricity bill', dueDate: '2026-11-05', priority: 'high' },
    { title: 'Read a book', description: 'Something light', priority: 'low' },
    { title: 'Call the bank', dueDate: '2026-10-28', priority: 'medium', done: true },
    { title: 'Plan 100% of the trip_budget', dueDate: '2026-12-01', priority: 'high' },
  ];
  for (const [i, { done, ...task }] of tasks.entries()) {
    const { body } = await owner.post('/api/tasks').send(task).expect(201);
    await pool.query('UPDATE tasks SET created_at = ? WHERE id = ?', [
      new Date(Date.UTC(2026, 9, 1, 12, 0, i)),
      body.id,
    ]);
    if (done) await owner.patch(`/api/tasks/${body.id}`).send({ completed: true }).expect(200);
  }
}

const titles = async (query: string) =>
  (await owner.get(`/api/tasks${query}`).expect(200)).body.map((t: { title: string }) => t.title);

beforeEach(async () => {
  await pool.query('DELETE FROM tasks');
});

describe('due date and priority', () => {
  it('are stored and returned (the date as a plain calendar day)', async () => {
    const res = await owner
      .post('/api/tasks')
      .send({ title: 'Renew the passport', dueDate: '2026-10-25', priority: 'high' })
      .expect(201);

    expect(res.body).toMatchObject({ dueDate: '2026-10-25', priority: 'high' });
    const [rows] = await pool.query('SELECT due_date, priority FROM tasks WHERE id = ?', [
      res.body.id,
    ]);
    expect(rows).toEqual([{ due_date: '2026-10-25', priority: 'high' }]);
  });

  it('can be changed and cleared with PATCH', async () => {
    const { body } = await owner
      .post('/api/tasks')
      .send({ title: 'Renew the passport', dueDate: '2026-10-25' });

    const changed = await owner
      .patch(`/api/tasks/${body.id}`)
      .send({ dueDate: null, priority: 'low' })
      .expect(200);
    expect(changed.body).toMatchObject({ dueDate: null, priority: 'low' });
  });

  it.each([
    ['a date in another format', { dueDate: '25/10/2026' }, 'dueDate'],
    ['a day that does not exist', { dueDate: '2026-02-30' }, 'dueDate'],
    ['an unknown priority', { priority: 'urgent' }, 'priority'],
  ])('rejects %s with 400', async (_case, extra, field) => {
    const res = await owner
      .post('/api/tasks')
      .send({ title: 'x', ...extra })
      .expect(400);
    expect(res.body.details[field]).toBeDefined();
  });

  it('records due date and priority changes in the history', async () => {
    const { body } = await owner.post('/api/tasks').send({ title: 'Renew the passport' });
    await owner.patch(`/api/tasks/${body.id}`).send({ dueDate: '2026-10-25', priority: 'high' });

    const [edit] = (await owner.get(`/api/tasks/${body.id}/history`)).body;
    expect(edit.changes).toEqual({
      dueDate: { from: null, to: '2026-10-25' },
      priority: { from: 'medium', to: 'high' },
    });
  });
});

describe('GET /api/tasks filters', () => {
  beforeEach(seedTasks);

  it('lists everything, newest first, by default', async () => {
    expect(await titles('')).toEqual([
      'Plan 100% of the trip_budget',
      'Call the bank',
      'Read a book',
      'Pay the electricity bill',
    ]);
  });

  it('filters by status', async () => {
    expect(await titles('?status=completed')).toEqual(['Call the bank']);
    expect(await titles('?status=pending')).not.toContain('Call the bank');
    expect(await titles('?status=all')).toHaveLength(4);
  });

  it('filters by priority', async () => {
    expect(await titles('?priority=high')).toEqual([
      'Plan 100% of the trip_budget',
      'Pay the electricity bill',
    ]);
  });

  it('searches the title and the description, ignoring case', async () => {
    expect(await titles('?search=BANK')).toEqual(['Call the bank']);
    expect(await titles('?search=light')).toEqual(['Read a book']);
  });

  it('treats % and _ in the search as plain characters', async () => {
    expect(await titles('?search=100%25')).toEqual(['Plan 100% of the trip_budget']);
    expect(await titles('?search=p_b')).toEqual(['Plan 100% of the trip_budget']);
    expect(await titles('?search=%25%25')).toEqual([]);
  });

  it('combines filters', async () => {
    expect(await titles('?status=pending&priority=high&search=bill')).toEqual([
      'Pay the electricity bill',
    ]);
  });

  it('sorts by due date, earliest first, tasks without a date last', async () => {
    expect(await titles('?sort=due_date')).toEqual([
      'Call the bank',
      'Pay the electricity bill',
      'Plan 100% of the trip_budget',
      'Read a book',
    ]);
    expect((await titles('?sort=due_date&order=desc')).at(-1)).toBe('Read a book');
  });

  it('sorts by priority, highest first', async () => {
    const sorted = await titles('?sort=priority');
    expect(sorted.slice(0, 2).sort()).toEqual([
      'Pay the electricity bill',
      'Plan 100% of the trip_budget',
    ]);
    expect(sorted.at(-1)).toBe('Read a book');
  });

  it.each([
    ['?status=done', 'status'],
    ['?priority=urgent', 'priority'],
    ['?sort=title', 'sort'],
    ['?order=up', 'order'],
    ['?status=all&status=pending', 'status'],
    [`?search=${'x'.repeat(101)}`, 'search'],
  ])('rejects %s with 400', async (query, field) => {
    const res = await owner.get(`/api/tasks${query}`).expect(400);
    expect(res.body.details[field]).toBeDefined();
  });

  it('does not let a crafted search reach the SQL (injection is just text)', async () => {
    expect(await titles(`?search=${encodeURIComponent("' OR '1'='1")}`)).toEqual([]);
  });
});
