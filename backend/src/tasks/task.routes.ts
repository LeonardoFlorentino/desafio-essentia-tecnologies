import { Router } from 'express';
import { HttpError } from '../http/errors';
import * as taskRepository from './task.repository';
import { createTaskSchema, updateTaskSchema } from './task.schemas';

// Thrown errors (validation, HttpError, database) are turned into responses by the
// error handler registered in app.ts; Express 5 forwards rejected promises to it.
export const taskRouter = Router();

/** Task ids are positive integers written as plain digits ("1e3", "0x10" or " 5" are rejected). */
function parseId(raw: string): number {
  if (!/^[1-9]\d{0,9}$/.test(raw)) throw new HttpError(400, 'Invalid task id');
  return Number(raw);
}

const taskNotFound = () => new HttpError(404, 'Task not found');

taskRouter.get('/', async (_req, res) => {
  res.json(await taskRepository.findAll());
});

taskRouter.post('/', async (req, res) => {
  const input = createTaskSchema.parse(req.body ?? {});
  res.status(201).json(await taskRepository.create(input));
});

taskRouter.get('/:id', async (req, res) => {
  const task = await taskRepository.findById(parseId(req.params.id));
  if (!task) throw taskNotFound();
  res.json(task);
});

taskRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const input = updateTaskSchema.parse(req.body ?? {});
  const task = await taskRepository.update(id, input);
  if (!task) throw taskNotFound();
  res.json(task);
});

taskRouter.delete('/:id', async (req, res) => {
  if (!(await taskRepository.remove(parseId(req.params.id)))) throw taskNotFound();
  res.status(204).end();
});
