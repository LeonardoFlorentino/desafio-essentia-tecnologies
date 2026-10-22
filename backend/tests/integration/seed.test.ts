import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import type { RowDataPacket } from 'mysql2/promise';
import request from 'supertest';
import { createApp } from '../../src/app';
import { DEMO_USER, seed } from '../../src/db/seed';
import { pool } from '../../src/db/mysql';

const quiet = () => {};

async function count(sql: string, params: unknown[] = []) {
  const [[row]] = await pool.query<RowDataPacket[]>(sql, params);
  return Number(row.total);
}

beforeEach(async () => {
  await pool.query('DELETE FROM tasks');
  await pool.query('DELETE FROM users');
});

afterAll(async () => {
  await pool.end();
});

describe('seed', () => {
  it('creates the demo user with sample tasks, and running again changes nothing', async () => {
    await seed(quiet);
    await seed(quiet);

    expect(
      await count('SELECT COUNT(*) AS total FROM users WHERE email = ?', [DEMO_USER.email]),
    ).toBe(1);
    expect(await count('SELECT COUNT(*) AS total FROM tasks')).toBe(3);
  });

  it('lets the demo user sign in and see the sample tasks', async () => {
    await seed(quiet);
    const agent = request.agent(createApp());

    await agent.post('/api/auth/login').send(DEMO_USER).expect(200);
    const res = await agent.get('/api/tasks').expect(200);
    expect(res.body).toHaveLength(3);
  });

  it('hands tasks without an owner to the demo user instead of adding samples', async () => {
    await pool.query("INSERT INTO tasks (title) VALUES ('Created before accounts existed')");

    await seed(quiet);

    expect(await count('SELECT COUNT(*) AS total FROM tasks WHERE user_id IS NULL')).toBe(0);
    expect(await count('SELECT COUNT(*) AS total FROM tasks')).toBe(1);
  });
});
