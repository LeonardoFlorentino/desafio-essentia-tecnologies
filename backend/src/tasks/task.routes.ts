import { Router, type Request } from 'express';
import { requireAuth } from '../auth/session';
import { HttpError } from '../http/errors';
import * as taskRepository from './task.repository';
import { createTaskSchema, updateTaskSchema } from './task.schemas';

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

taskRouter.get('/', async (req, res) => {
  res.json(await taskRepository.findAll(userId(req)));
});

taskRouter.post('/', async (req, res) => {
  const input = createTaskSchema.parse(req.body ?? {});
  res.status(201).json(await taskRepository.create(input, userId(req)));
});

taskRouter.get('/:id', async (req, res) => {
  const task = await taskRepository.findById(parseId(req.params.id), userId(req));
  if (!task) throw taskNotFound();
  res.json(task);
});

taskRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const input = updateTaskSchema.parse(req.body ?? {});
  const task = await taskRepository.update(id, userId(req), input);
  if (!task) throw taskNotFound();
  res.json(task);
});

taskRouter.delete('/:id', async (req, res) => {
  if (!(await taskRepository.remove(parseId(req.params.id), userId(req)))) throw taskNotFound();
  res.status(204).end();
});
