import { Router, type Request } from 'express';
import { requireAuth } from '../auth/session';
import { HttpError } from '../http/errors';
import { getDetails, removeDetails, saveDetails } from './task-details';
import { listEvents, recordEvent, type TaskChanges } from './task-history';
import * as taskRepository from './task.repository';
import { createTaskSchema, taskDetailsSchema, updateTaskSchema } from './task.schemas';
import type { Task } from './task.types';

// Thrown errors (validation, HttpError, database) are turned into responses by the
// error handler registered in app.ts; Express 5 forwards rejected promises to it.
export const taskRouter = Router();

// Every task route needs a session, and only ever sees the signed-in user's tasks.
taskRouter.use(requireAuth);

/** Task ids are positive integers written as plain digits ("1e3", "0x10" or " 5" are rejected). */
function parseId(raw: string): number {
  if (!/^[1-9]\d{0,9}$/.test(raw)) throw new HttpError(400, 'Invalid task id');
  return Number(raw);
}

/** Set by requireAuth, which runs before every route of this router. */
const userId = (req: Request) => req.user!.id;

const taskNotFound = () => new HttpError(404, 'Task not found');

/** The task (from MySQL, owner-scoped) that a /:id route is about; 404 if the user has none. */
async function ownTask(req: Request): Promise<Task> {
  const task = await taskRepository.findById(parseId(req.params.id as string), userId(req));
  if (!task) throw taskNotFound();
  return task;
}

/** Which fields really changed, from → to (fields sent with the same value are not changes). */
function diff(before: Task, after: Task): TaskChanges {
  const changes: TaskChanges = {};
  for (const field of ['title', 'description', 'completed'] as const) {
    if (before[field] !== after[field]) changes[field] = { from: before[field], to: after[field] };
  }
  return changes;
}

taskRouter.get('/', async (req, res) => {
  res.json(await taskRepository.findAll(userId(req)));
});

taskRouter.post('/', async (req, res) => {
  const input = createTaskSchema.parse(req.body ?? {});
  const task = await taskRepository.create(input, userId(req));
  await recordEvent(task.id, userId(req), 'created');
  res.status(201).json(task);
});

taskRouter.get('/:id', async (req, res) => {
  res.json(await ownTask(req));
});

taskRouter.patch('/:id', async (req, res) => {
  const before = await ownTask(req);
  const input = updateTaskSchema.parse(req.body ?? {});
  const after = (await taskRepository.update(before.id, userId(req), input))!;

  const changes = diff(before, after);
  const fields = Object.keys(changes);
  if (fields.length === 1 && fields[0] === 'completed') {
    await recordEvent(after.id, userId(req), after.completed ? 'completed' : 'reopened');
  } else if (fields.length > 0) {
    await recordEvent(after.id, userId(req), 'updated', changes);
  }
  res.json(after);
});

taskRouter.delete('/:id', async (req, res) => {
  const task = await ownTask(req);
  await taskRepository.remove(task.id, userId(req));
  await removeDetails(task.id, userId(req));
  await recordEvent(task.id, userId(req), 'deleted');
  res.status(204).end();
});

taskRouter.get('/:id/details', async (req, res) => {
  const task = await ownTask(req);
  res.json(await getDetails(task.id, userId(req)));
});

taskRouter.put('/:id/details', async (req, res) => {
  const task = await ownTask(req);
  const details = await saveDetails(task.id, userId(req), taskDetailsSchema.parse(req.body ?? {}));
  await recordEvent(task.id, userId(req), 'details_updated');
  res.json(details);
});

taskRouter.get('/:id/history', async (req, res) => {
  const task = await ownTask(req);
  res.json(await listEvents(task.id, userId(req)));
});
