import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../db/mysql';

/** The public view of a user: never includes the password hash. */
export interface User {
  id: number;
  email: string;
}

interface UserRow extends RowDataPacket {
  id: number;
  email: string;
  password_hash: string;
}

export async function findByEmail(
  email: string,
): Promise<(User & { passwordHash: string }) | null> {
  const [rows] = await pool.query<UserRow[]>(
    'SELECT id, email, password_hash FROM users WHERE email = ?',
    [email],
  );
  const row = rows[0];
  return row ? { id: row.id, email: row.email, passwordHash: row.password_hash } : null;
}

export async function findById(id: number): Promise<User | null> {
  const [rows] = await pool.query<UserRow[]>('SELECT id, email FROM users WHERE id = ?', [id]);
  const row = rows[0];
  return row ? { id: row.id, email: row.email } : null;
}

/** Returns null when the email is already registered (unique constraint). */
export async function create(email: string, passwordHash: string): Promise<User | null> {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, passwordHash],
    );
    return { id: result.insertId, email };
  } catch (error) {
    if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return null;
    throw error;
  }
}
