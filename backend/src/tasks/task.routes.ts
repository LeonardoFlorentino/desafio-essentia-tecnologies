import { Router } from 'express';
import * as taskRepository from './task.repository';

export const taskRouter = Router();

taskRouter.get('/', async (_req, res) => {
  res.json(await taskRepository.findAll());
});
