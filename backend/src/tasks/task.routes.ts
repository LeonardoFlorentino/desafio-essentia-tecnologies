import { Router, type Response } from 'express';
import { z } from 'zod';
import * as taskRepository from './task.repository';
import { createTaskSchema, updateTaskSchema } from './task.schemas';

export const taskRouter = Router();

function sendValidationError(res: Response, error: z.ZodError) {
  const { formErrors, fieldErrors } = z.flattenError(error);
  res.status(400).json({
    error: 'Validation failed',
    details: formErrors.length > 0 ? { ...fieldErrors, _errors: formErrors } : fieldErrors,
  });
}

/** Task ids are positive integers written as plain digits ("1e3", "0x10" or " 5" are rejected). */
function parseId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

taskRouter.get('/', async (_req, res) => {
  res.json(await taskRepository.findAll());
});

taskRouter.post('/', async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body ?? {});
  if (!parsed.success) return sendValidationError(res, parsed.error);
  res.status(201).json(await taskRepository.create(parsed.data));
});

taskRouter.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid task id' });
    return;
  }

  const task = await taskRepository.findById(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
});

taskRouter.patch('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid task id' });
    return;
  }

  const parsed = updateTaskSchema.safeParse(req.body ?? {});
  if (!parsed.success) return sendValidationError(res, parsed.error);

  const task = await taskRepository.update(id, parsed.data);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
});

taskRouter.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'Invalid task id' });
    return;
  }

  if (!(await taskRepository.remove(id))) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.status(204).end();
});
