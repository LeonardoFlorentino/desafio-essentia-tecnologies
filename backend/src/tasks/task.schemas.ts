import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z
    .string({
      error: (issue) => (issue.input === undefined ? 'Title is required' : 'Title must be text'),
    })
    .trim()
    .min(1, 'Title is required')
    .max(255, 'Title must be at most 255 characters'),
  // An empty or blank description is stored as NULL.
  description: z
    .string({ error: 'Description must be text' })
    .trim()
    .max(5000, 'Description must be at most 5000 characters')
    .nullish()
    .transform((value) => value || null),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
