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

export async function findAll(): Promise<Task[]> {
  const [rows] = await pool.query<TaskRow[]>(
    `SELECT ${columns} FROM tasks ORDER BY created_at DESC, id DESC`,
  );
  return rows.map(toTask);
}

export async function findById(id: number): Promise<Task | null> {
  const [rows] = await pool.query<TaskRow[]>(`SELECT ${columns} FROM tasks WHERE id = ?`, [id]);
  return rows[0] ? toTask(rows[0]) : null;
}

export async function create(input: CreateTaskInput): Promise<Task> {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO tasks (title, description) VALUES (?, ?)',
    [input.title, input.description],
  );
  // Read back so the response carries the defaults set by MySQL (completed, timestamps).
  return (await findById(result.insertId))!;
}

/** Updates only the fields present in `input`; returns null when the task does not exist. */
export async function update(id: number, input: UpdateTaskInput): Promise<Task | null> {
  // Column names come from this fixed list, never from the request, so they are safe to interpolate.
  const fields = (['title', 'description', 'completed'] as const).filter(
    (field) => input[field] !== undefined,
  );
  await pool.query(
    `UPDATE tasks SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE id = ?`,
    [...fields.map((field) => input[field]), id],
  );
  return findById(id);
}
