import { z } from 'zod';
import { PRIORITIES } from './task.types';

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

// A calendar day such as 2026-10-25 (also checks that the day exists); null clears it.
const dueDate = z.iso
  .date({ error: 'Due date must be a date in the YYYY-MM-DD format' })
  .nullable();

const priority = z.enum(PRIORITIES, { error: 'Priority must be low, medium or high' });

export const createTaskSchema = z.object({
  title,
  description: description.optional().transform((value) => value ?? null),
  dueDate: dueDate.optional().transform((value) => value ?? null),
  priority: priority.default('medium'),
});

// Every field is optional, but fields left out stay undefined (not null) so they are not touched.
export const updateTaskSchema = z
  .object({ title, description, completed, dueDate, priority })
  .partial()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    error: 'Send at least one of: title, description, completed, dueDate, priority',
  });

/** Query string of GET /tasks. Unknown values are rejected (400) instead of silently ignored. */
export const listTasksQuerySchema = z.object({
  status: z
    .enum(['all', 'pending', 'completed'], {
      error: 'Status must be all, pending or completed',
    })
    .default('all'),
  priority: priority.optional(),
  search: z.string().trim().max(100, 'Search must be at most 100 characters').optional(),
  sort: z
    .enum(['created_at', 'due_date', 'priority'], {
      error: 'Sort must be created_at, due_date or priority',
    })
    .default('created_at'),
  order: z.enum(['asc', 'desc'], { error: 'Order must be asc or desc' }).optional(),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

// PUT replaces the whole details document, so both fields are required (empty is fine).
export const taskDetailsSchema = z.object({
  notes: z
    .string({ error: 'Notes must be text' })
    .trim()
    .max(10000, 'Notes must be at most 10000 characters'),
  tags: z
    .array(
      z
        .string({ error: 'Each tag must be text' })
        .trim()
        .min(1, 'Tags cannot be empty')
        .max(30, 'Each tag must be at most 30 characters'),
      { error: 'Tags must be a list' },
    )
    .max(10, 'At most 10 tags')
    // "Urgent" and "urgent " are the same tag: keep the first spelling of each.
    .transform((tags) =>
      tags.filter(
        (tag, i) => tags.findIndex((other) => other.toLowerCase() === tag.toLowerCase()) === i,
      ),
    ),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
