import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app';
import { pool } from '../../src/db/mysql';

const app = createApp();

beforeEach(async () => {
  await pool.query('DELETE FROM tasks');
});

afterAll(async () => {
  await pool.end();
});

async function createTask(body: object = { title: 'Write the report' }) {
  const res = await request(app).post('/api/tasks').send(body).expect(201);
  return res.body;
}

describe('GET /api/health', () => {
  it('reports the API and the database as healthy', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'ok' });
  });
});

describe('GET /api/tasks', () => {
  it('returns an empty list when there are no tasks', async () => {
    const res = await request(app).get('/api/tasks').expect(200);
    expect(res.body).toEqual([]);
  });

  it('lists every task, newest first', async () => {
    const first = await createTask({ title: 'First' });
    const second = await createTask({ title: 'Second' });

    const res = await request(app).get('/api/tasks').expect(200);

    expect(res.body.map((task: { id: number }) => task.id)).toEqual([second.id, first.id]);
  });
});

describe('POST /api/tasks', () => {
  it('creates a pending task and returns it', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: '  Buy coffee  ', description: 'At the bakery' })
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(Number),
      title: 'Buy coffee',
      description: 'At the bakery',
      completed: false,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('stores a missing or blank description as null', async () => {
    expect((await createTask({ title: 'No description' })).description).toBeNull();
    expect((await createTask({ title: 'Blank', description: '   ' })).description).toBeNull();
  });

  it.each([
    ['missing title', {}, 'title', 'Title is required'],
    ['blank title', { title: '   ' }, 'title', 'Title is required'],
    ['title too long', { title: 'a'.repeat(256) }, 'title', 'Title must be at most 255 characters'],
    ['title not text', { title: 123 }, 'title', 'Title must be text'],
    [
      'description not text',
      { title: 'Ok', description: 42 },
      'description',
      'Description must be text',
    ],
  ])('rejects %s with 400', async (_case, body, field, message) => {
    const res = await request(app).post('/api/tasks').send(body).expect(400);

    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details[field]).toEqual([message]);
  });

  it('rejects a malformed JSON body with 400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ')
      .expect(400);

    expect(res.body).toEqual({ error: 'Malformed JSON body' });
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns the task', async () => {
    const task = await createTask();
    const res = await request(app).get(`/api/tasks/${task.id}`).expect(200);
    expect(res.body).toEqual(task);
  });

  it('returns 404 for a task that does not exist', async () => {
    const res = await request(app).get('/api/tasks/999999').expect(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  it.each(['abc', '0', '-1', '1.5', '1e3'])('rejects the invalid id "%s" with 400', async (id) => {
    const res = await request(app).get(`/api/tasks/${id}`).expect(400);
    expect(res.body).toEqual({ error: 'Invalid task id' });
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('marks a task as completed and back as pending', async () => {
    const task = await createTask();

    const done = await request(app).patch(`/api/tasks/${task.id}`).send({ completed: true });
    expect(done.status).toBe(200);
    expect(done.body.completed).toBe(true);

    const pending = await request(app).patch(`/api/tasks/${task.id}`).send({ completed: false });
    expect(pending.body.completed).toBe(false);
  });

  it('changes only the fields that were sent', async () => {
    const task = await createTask({ title: 'Original', description: 'Keep me' });

    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ title: 'Edited' })
      .expect(200);

    expect(res.body).toMatchObject({ title: 'Edited', description: 'Keep me', completed: false });
  });

  it('persists the change', async () => {
    const task = await createTask();
    await request(app).patch(`/api/tasks/${task.id}`).send({ completed: true }).expect(200);

    const res = await request(app).get(`/api/tasks/${task.id}`).expect(200);
    expect(res.body.completed).toBe(true);
  });

  it('rejects an empty body with 400', async () => {
    const task = await createTask();
    const res = await request(app).patch(`/api/tasks/${task.id}`).send({}).expect(400);
    expect(res.body.details._errors).toEqual([
      'Send at least one of: title, description, completed',
    ]);
  });

  it('rejects a non-boolean completed with 400', async () => {
    const task = await createTask();
    const res = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ completed: 'yes' })
      .expect(400);
    expect(res.body.details.completed).toEqual(['Completed must be true or false']);
  });

  it('returns 404 for a task that does not exist', async () => {
    await request(app).patch('/api/tasks/999999').send({ completed: true }).expect(404);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('deletes the task and answers 204 with no body', async () => {
    const task = await createTask();

    const res = await request(app).delete(`/api/tasks/${task.id}`).expect(204);
    expect(res.text).toBe('');

    await request(app).get(`/api/tasks/${task.id}`).expect(404);
  });

  it('keeps the other tasks', async () => {
    const kept = await createTask({ title: 'Keep' });
    const removed = await createTask({ title: 'Remove' });

    await request(app).delete(`/api/tasks/${removed.id}`).expect(204);

    const res = await request(app).get('/api/tasks').expect(200);
    expect(res.body.map((task: { id: number }) => task.id)).toEqual([kept.id]);
  });

  it('returns 404 for a task that does not exist', async () => {
    await request(app).delete('/api/tasks/999999').expect(404);
  });
});

describe('unknown routes', () => {
  it('answer 404 in JSON', async () => {
    const res = await request(app).get('/api/nothing-here').expect(404);
    expect(res.body).toEqual({ error: 'Route not found: GET /api/nothing-here' });
  });
});
