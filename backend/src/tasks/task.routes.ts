import { Router } from 'express';
import { z } from 'zod';
import * as taskRepository from './task.repository';
import { createTaskSchema } from './task.schemas';

export const taskRouter = Router();

taskRouter.get('/', async (_req, res) => {
  res.json(await taskRepository.findAll());
});

taskRouter.post('/', async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: z.flattenError(parsed.error).fieldErrors,
    });
    return;
  }
  res.status(201).json(await taskRepository.create(parsed.data));
});
