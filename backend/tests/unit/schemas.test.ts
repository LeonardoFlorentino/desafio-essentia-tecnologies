import { describe, expect, it } from '@jest/globals';
import { loginSchema, registerSchema } from '../../src/auth/auth.schemas';
import {
  createTaskSchema,
  listTasksQuerySchema,
  taskDetailsSchema,
  updateTaskSchema,
} from '../../src/tasks/task.schemas';

const issues = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe('createTaskSchema', () => {
  it('trims the title and fills the defaults', () => {
    expect(createTaskSchema.parse({ title: '  Buy coffee  ' })).toEqual({
      title: 'Buy coffee',
      description: null,
      dueDate: null,
      priority: 'medium',
    });
  });

  it('stores a blank description as null', () => {
    expect(createTaskSchema.parse({ title: 'x', description: '   ' }).description).toBeNull();
  });

  it.each([
    [{}, 'Title is required'],
    [{ title: '   ' }, 'Title is required'],
    [{ title: 42 }, 'Title must be text'],
    [{ title: 'a'.repeat(256) }, 'Title must be at most 255 characters'],
    [{ title: 'x', description: 'a'.repeat(5001) }, 'Description must be at most 5000 characters'],
    [{ title: 'x', dueDate: '2026-02-30' }, 'Due date must be a date in the YYYY-MM-DD format'],
    [{ title: 'x', dueDate: '30/10/2026' }, 'Due date must be a date in the YYYY-MM-DD format'],
    [{ title: 'x', priority: 'urgent' }, 'Priority must be low, medium or high'],
  ])('rejects %j: "%s"', (input, message) => {
    expect(issues(createTaskSchema.safeParse(input))).toContain(message);
  });
});

describe('updateTaskSchema', () => {
  it('keeps only the fields that were sent (absent ones stay undefined)', () => {
    expect(updateTaskSchema.parse({ completed: true })).toEqual({ completed: true });
  });

  it('accepts null to clear the description and the due date', () => {
    expect(updateTaskSchema.parse({ description: null, dueDate: null })).toEqual({
      description: null,
      dueDate: null,
    });
  });

  it('requires at least one field', () => {
    expect(issues(updateTaskSchema.safeParse({}))).toEqual([
      'Send at least one of: title, description, completed, dueDate, priority',
    ]);
  });

  it('drops unknown fields such as the owner', () => {
    expect(updateTaskSchema.parse({ title: 'x', userId: 2, id: 9 })).toEqual({ title: 'x' });
  });
});

describe('listTasksQuerySchema', () => {
  it('defaults to every task, newest first', () => {
    expect(listTasksQuerySchema.parse({})).toEqual({ status: 'all', sort: 'created_at' });
  });

  it('trims the search', () => {
    expect(listTasksQuerySchema.parse({ search: '  report ' }).search).toBe('report');
  });

  it.each([
    [{ status: 'done' }],
    [{ priority: 'urgent' }],
    [{ sort: 'title' }],
    [{ order: 'up' }],
    [{ search: 'x'.repeat(101) }],
    [{ status: ['all', 'pending'] }],
  ])('rejects %j instead of ignoring it', (query) => {
    expect(listTasksQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('taskDetailsSchema', () => {
  it('trims the tags and drops repeats, ignoring case (first spelling wins)', () => {
    expect(
      taskDetailsSchema.parse({ notes: ' n ', tags: [' Urgent', 'urgent ', 'home', 'HOME'] }),
    ).toEqual({ notes: 'n', tags: ['Urgent', 'home'] });
  });

  it.each([
    [{ notes: 'x', tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }, 'At most 10 tags'],
    [{ notes: 'x', tags: ['a'.repeat(31)] }, 'Each tag must be at most 30 characters'],
    [{ notes: 'x', tags: ['  '] }, 'Tags cannot be empty'],
    [{ notes: 'a'.repeat(10001), tags: [] }, 'Notes must be at most 10000 characters'],
    [{ notes: { $ne: null }, tags: [] }, 'Notes must be text'],
  ])('rejects %j', (input, message) => {
    expect(issues(taskDetailsSchema.safeParse(input))).toContain(message);
  });
});

describe('registerSchema and loginSchema', () => {
  it('normalizes the email: trimmed and lowercase', () => {
    expect(registerSchema.parse({ email: '  Ana@TechX.com ', password: '12345678' }).email).toBe(
      'ana@techx.com',
    );
  });

  it('limits the password to 72 bytes (what bcrypt uses), counting multi-byte characters', () => {
    expect(registerSchema.safeParse({ email: 'a@b.co', password: 'a'.repeat(72) }).success).toBe(
      true,
    );
    // 19 emoji = 76 bytes, although only 38 UTF-16 units.
    expect(
      issues(registerSchema.safeParse({ email: 'a@b.co', password: '😀'.repeat(19) })),
    ).toContain('Password must be at most 72 bytes');
  });

  it.each([
    [{ email: 'not-an-email', password: '12345678' }, 'Email is invalid'],
    [{ email: 'a@b.co', password: '1234567' }, 'Password must be at least 8 characters'],
    [{ password: '12345678' }, 'Email is required'],
  ])('rejects a registration with %j', (input, message) => {
    expect(issues(registerSchema.safeParse(input))).toContain(message);
  });

  it('does not repeat the registration rules at login (a short password is just wrong)', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(issues(loginSchema.safeParse({ email: 'a@b.co', password: '' }))).toContain(
      'Password is required',
    );
  });
});
