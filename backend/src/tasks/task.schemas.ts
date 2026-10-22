import { z } from 'zod';

const title = z
  .string({
    error: (issue) => (issue.input === undefined ? 'Title is required' : 'Title must be text'),
  })
  .trim()
  .min(1, 'Title is required')
  .max(255, 'Title must be at most 255 characters');

// An empty or blank description is stored as NULL.
const description = z
  .string({ error: 'Description must be text' })
  .trim()
  .max(5000, 'Description must be at most 5000 characters')
  .nullable()
  .transform((value) => value || null);

const completed = z.boolean({ error: 'Completed must be true or false' });

export const createTaskSchema = z.object({
  title,
  description: description.optional().transform((value) => value ?? null),
});

// Every field is optional, but fields left out stay undefined (not null) so they are not touched.
export const updateTaskSchema = z
  .object({ title, description, completed })
  .partial()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    error: 'Send at least one of: title, description, completed',
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
