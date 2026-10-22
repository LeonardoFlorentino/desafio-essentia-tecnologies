import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../db/mysql';

// Dates go in and are compared as JS Date parameters (never NOW()), so the API and MySQL time
// zones can differ without a token being purged too early or too late.

/** Marks a token id as no longer valid; logging out twice with the same token is harmless. */
export async function revoke(jti: string, expiresAt: Date): Promise<void> {
  await pool.query('INSERT IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)', [
    jti,
    expiresAt,
  ]);
}

export async function isRevoked(jti: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 FROM revoked_tokens WHERE jti = ?', [
    jti,
  ]);
  return rows.length > 0;
}

/** Deletes the rows of tokens that have expired by now; returns how many were removed. */
export async function purgeExpired(now = new Date()): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    'DELETE FROM revoked_tokens WHERE expires_at < ?',
    [now],
  );
  return result.affectedRows;
}
