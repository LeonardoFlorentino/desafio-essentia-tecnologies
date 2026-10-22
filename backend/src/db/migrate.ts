import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { config } from '../config';

// Kept outside src/ so the same .sql files serve both tsx (src/db) and the compiled build (dist/db).
const migrationsDir = path.join(__dirname, '..', '..', 'migrations');

/** Applies, in file name order, every migrations/*.sql not yet recorded in the `migrations` table. */
export async function migrate(log: (message: string) => void = console.log): Promise<void> {
  // A dedicated connection: multipleStatements lets a .sql file hold several statements,
  // and stays off the application pool, where it would widen the impact of an SQL injection.
  const connection = await mysql.createConnection({ ...config.db, multipleStatements: true });
  try {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS migrations (
         name VARCHAR(255) PRIMARY KEY,
         applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       )`,
    );
    const [rows] = await connection.query<RowDataPacket[]>('SELECT name FROM migrations');
    const applied = new Set(rows.map((row) => row.name as string));
    const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();

    const pending = files.filter((file) => !applied.has(file));
    // MySQL commits DDL implicitly, so no transaction here: a file that fails halfway stays
    // partially applied and must be fixed by hand before running again.
    for (const file of pending) {
      const sql = await readFile(path.join(migrationsDir, file), 'utf8');
      await connection.query(sql);
      await connection.query('INSERT INTO migrations (name) VALUES (?)', [file]);
      log(`applied ${file}`);
    }
    if (pending.length === 0) log('database is up to date');
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  migrate().catch((error: unknown) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}
