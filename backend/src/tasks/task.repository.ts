import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../db/mysql';
import type { CreateTaskInput, UpdateTaskInput } from './task.schemas';
import type { Task } from './task.types';

interface TaskRow extends RowDataPacket {
  id: number;
  title: string;
  description: string | null;
  completed: number;
  created_at: Date;
  updated_at: Date;
}

const columns = 'id, title, description, completed, created_at, updated_at';

// MySQL stores BOOLEAN as TINYINT(1) and uses snake_case; the API speaks booleans and camelCase.
function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Every query is scoped by user_id: another user's task behaves exactly like one that does not
// exist (null / false → 404), so ids cannot be probed to learn about other accounts.

export async function findAll(userId: number): Promise<Task[]> {
  const [rows] = await pool.query<TaskRow[]>(
    `SELECT ${columns} FROM tasks WHERE user_id = ? ORDER BY created_at DESC, id DESC`,
    [userId],
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
    'INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)',
    [userId, input.title, input.description],
  );
  // Read back so the response carries the defaults set by MySQL (completed, timestamps).
  return (await findById(result.insertId, userId))!;
}

/** Updates only the fields present in `input`; returns null when the user has no such task. */
export async function update(
  id: number,
  userId: number,
  input: UpdateTaskInput,
): Promise<Task | null> {
  // Column names come from this fixed list, never from the request, so they are safe to interpolate.
  const fields = (['title', 'description', 'completed'] as const).filter(
    (field) => input[field] !== undefined,
  );
  await pool.query(
    `UPDATE tasks SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ? AND user_id = ?`,
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
