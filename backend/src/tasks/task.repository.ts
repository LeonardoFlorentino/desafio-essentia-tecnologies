import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../db/mysql';
import type { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from './task.schemas';
import type { Priority, Task } from './task.types';

interface TaskRow extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  completed: number;
  due_date: string | null;
  priority: Priority;
  created_at: Date;
  updated_at: Date;
}

const columns = 'id, title, description, completed, due_date, priority, created_at, updated_at';

// MySQL stores BOOLEAN as TINYINT(1) and uses snake_case; the API speaks booleans and camelCase.
function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed === 1,
    dueDate: row.due_date,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Every query is scoped by user_id: another user's task behaves exactly like one that does not
// exist (null / false → 404), so ids cannot be probed to learn about other accounts.

/** ORDER BY clauses, picked from this fixed table (never built from the request). */
const ORDER_BY = {
  created_at: (dir: string) => `created_at ${dir}`,
  // Tasks without a due date go last whatever the direction.
  due_date: (dir: string) => `due_date IS NULL, due_date ${dir}`,
  // An ENUM sorts by its declared order: low < medium < high.
  priority: (dir: string) => `priority ${dir}`,
} as const;

/** Natural direction of each sort: newest first, earliest deadline first, highest priority first. */
const DEFAULT_ORDER = { created_at: 'desc', due_date: 'asc', priority: 'desc' } as const;

/** `%` and `_` typed by the user are literal characters, not LIKE wildcards. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

export async function findAll(
  userId: number,
  query: ListTasksQuery = { status: 'all', sort: 'created_at' },
): Promise<Task[]> {
  const where = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (query.status !== 'all') {
    where.push('completed = ?');
    params.push(query.status === 'completed');
  }
  if (query.priority) {
    where.push('priority = ?');
    params.push(query.priority);
  }
  if (query.search) {
    where.push('(title LIKE ? OR description LIKE ?)');
    const pattern = `%${escapeLike(query.search)}%`;
    params.push(pattern, pattern);
  }

  const direction = (query.order ?? DEFAULT_ORDER[query.sort]).toUpperCase();
  const [rows] = await pool.query<TaskRow[]>(
    `SELECT ${columns} FROM tasks WHERE ${where.join(' AND ')}
     ORDER BY ${ORDER_BY[query.sort](direction)}, created_at DESC, id DESC`,
    params,
  );
  return rows.map(toTask);
}

export async function findById(id: number, userId: number): Promise<Task | null> {
  const [rows] = await pool.query<TaskRow[]>(
    `SELECT ${columns} FROM tasks WHERE id = ? AND user_id = ?`,
    [id, userId],
  );
  return rows[0] ? toTask(rows[0]) : null;
}

export async function create(input: CreateTaskInput, userId: number): Promise<Task> {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO tasks (user_id, title, description, due_date, priority) VALUES (?, ?, ?, ?, ?)',
    [userId, input.title, input.description, input.dueDate, input.priority],
  );
  // Read back so the response carries the defaults set by MySQL (completed, timestamps).
  return (await findById(result.insertId, userId))!;
}

/** API field → column. Column names come from here, never from the request. */
const UPDATABLE = {
  title: 'title',
  description: 'description',
  completed: 'completed',
  dueDate: 'due_date',
  priority: 'priority',
} as const;

/** Updates only the fields present in `input`; returns null when the user has no such task. */
export async function update(
  id: number,
  userId: number,
  input: UpdateTaskInput,
): Promise<Task | null> {
  const fields = (Object.keys(UPDATABLE) as (keyof typeof UPDATABLE)[]).filter(
    (field) => input[field] !== undefined,
  );
  await pool.query(
    `UPDATE tasks SET ${fields.map((field) => `${UPDATABLE[field]} = ?`).join(', ')}
     WHERE id = ? AND user_id = ?`,
    [...fields.map((field) => input[field]), id, userId],
  );
  return findById(id, userId);
}

/** Returns false when the user has no task with this id. */
export async function remove(id: number, userId: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM tasks WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return result.affectedRows > 0;
}
