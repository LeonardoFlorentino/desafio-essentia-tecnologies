import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../src/app';
import { pool } from '../../src/db/mysql';
import { TaskDetailsModel } from '../../src/tasks/task-details';
import { TaskEventModel } from '../../src/tasks/task-history';

const app = createApp();
const owner = request.agent(app);
const intruder = request.agent(app);
let taskId: number;

beforeAll(async () => {
  await pool.query('DELETE FROM users');
  await owner
    .post('/api/auth/register')
    .send({ email: 'owner@techx.com', password: 'owner-password' });
  await intruder
    .post('/api/auth/register')
    .send({ email: 'intruder@techx.com', password: 'intruder-password' });
});

beforeEach(async () => {
  await pool.query('DELETE FROM tasks');
  await TaskDetailsModel.deleteMany({});
  await TaskEventModel.deleteMany({});
  taskId = (await owner.post('/api/tasks').send({ title: 'Write the report' }).expect(201)).body.id;
});

afterAll(async () => {
  await pool.end();
});

const types = async () =>
  (await owner.get(`/api/tasks/${taskId}/history`).expect(200)).body.map(
    (event: { type: string }) => event.type,
  );

describe('GET /api/tasks/:id/details', () => {
  it('starts with no notes and no tags', async () => {
    const res = await owner.get(`/api/tasks/${taskId}/details`).expect(200);
    expect(res.body).toEqual({ notes: '', tags: [] });
  });
});

describe('PUT /api/tasks/:id/details', () => {
  it('saves notes and tags in MongoDB and returns them', async () => {
    const res = await owner
      .put(`/api/tasks/${taskId}/details`)
      .send({ notes: '  Ask Ana for the Q3 numbers  ', tags: ['finance', ' urgent ', 'Urgent'] })
      .expect(200);

    expect(res.body).toEqual({ notes: 'Ask Ana for the Q3 numbers', tags: ['finance', 'urgent'] });
    expect((await owner.get(`/api/tasks/${taskId}/details`)).body).toEqual(res.body);

    const stored = await TaskDetailsModel.findOne({ taskId }).lean();
    expect(stored).toMatchObject({
      notes: 'Ask Ana for the Q3 numbers',
      tags: ['finance', 'urgent'],
    });
  });

  it('replaces the previous details (one document per task)', async () => {
    await owner.put(`/api/tasks/${taskId}/details`).send({ notes: 'first', tags: ['a'] });
    await owner.put(`/api/tasks/${taskId}/details`).send({ notes: 'second', tags: [] }).expect(200);

    expect(await TaskDetailsModel.countDocuments({ taskId })).toBe(1);
    expect((await owner.get(`/api/tasks/${taskId}/details`)).body).toEqual({
      notes: 'second',
      tags: [],
    });
  });

  it.each([
    ['notes missing', { tags: [] }, 'notes'],
    ['tags not a list', { notes: '', tags: 'urgent' }, 'tags'],
    ['an empty tag', { notes: '', tags: ['  '] }, 'tags'],
    ['a tag over 30 characters', { notes: '', tags: ['x'.repeat(31)] }, 'tags'],
    [
      'more than 10 tags',
      { notes: '', tags: Array.from({ length: 11 }, (_, i) => `t${i}`) },
      'tags',
    ],
    ['a MongoDB operator instead of text', { notes: { $gt: '' }, tags: [] }, 'notes'],
  ])('rejects %s with 400', async (_case, body, field) => {
    const res = await owner.put(`/api/tasks/${taskId}/details`).send(body).expect(400);
    expect(res.body.details[field]).toBeDefined();
  });
});

describe('GET /api/tasks/:id/history', () => {
  it('records what happened to the task, newest first', async () => {
    await owner.patch(`/api/tasks/${taskId}`).send({ title: 'Write the final report' });
    await owner.patch(`/api/tasks/${taskId}`).send({ completed: true });
    await owner.patch(`/api/tasks/${taskId}`).send({ completed: false });
    await owner.put(`/api/tasks/${taskId}/details`).send({ notes: 'n', tags: [] });

    expect(await types()).toEqual([
      'details_updated',
      'reopened',
      'completed',
      'updated',
      'created',
    ]);
  });

  it('keeps the before and after values of an edit', async () => {
    await owner
      .patch(`/api/tasks/${taskId}`)
      .send({ title: 'Write the final report', description: 'With charts' });

    const [edit] = (await owner.get(`/api/tasks/${taskId}/history`)).body;
    expect(edit).toEqual({
      type: 'updated',
      changes: {
        title: { from: 'Write the report', to: 'Write the final report' },
        description: { from: null, to: 'With charts' },
      },
      at: expect.any(String),
    });
  });

  it('does not record an edit that changed nothing', async () => {
    await owner.patch(`/api/tasks/${taskId}`).send({ title: 'Write the report' }).expect(200);
    expect(await types()).toEqual(['created']);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('removes the details from MongoDB and records the deletion', async () => {
    await owner.put(`/api/tasks/${taskId}/details`).send({ notes: 'n', tags: ['x'] });

    await owner.delete(`/api/tasks/${taskId}`).expect(204);

    expect(await TaskDetailsModel.countDocuments({ taskId })).toBe(0);
    const last = await TaskEventModel.findOne({ taskId }).sort({ at: -1, _id: -1 }).lean();
    expect(last?.type).toBe('deleted');
  });
});

describe('another user', () => {
  it("gets 404 for the owner's details and history, and cannot change them", async () => {
    await owner.put(`/api/tasks/${taskId}/details`).send({ notes: 'private', tags: [] });

    await intruder.get(`/api/tasks/${taskId}/details`).expect(404);
    await intruder.get(`/api/tasks/${taskId}/history`).expect(404);
    await intruder
      .put(`/api/tasks/${taskId}/details`)
      .send({ notes: 'hacked', tags: [] })
      .expect(404);

    expect((await owner.get(`/api/tasks/${taskId}/details`)).body.notes).toBe('private');
  });

  it('answers 401 without a session', async () => {
    await request(app).get(`/api/tasks/${taskId}/details`).expect(401);
    await request(app).get(`/api/tasks/${taskId}/history`).expect(401);
  });
});
