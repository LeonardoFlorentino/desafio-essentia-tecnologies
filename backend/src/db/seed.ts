import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { register } from '../auth/auth.service';
import * as userRepository from '../auth/user.repository';
import { pool } from './mysql';

/** Demo account documented in the README, so a fresh clone has something to sign in with. */
export const DEMO_USER = { email: 'demo@techx.com', password: 'demo12345' };

const SAMPLE_TASKS = [
  {
    title: 'Revisar o relatório trimestral',
    description: 'Conferir os números antes da reunião',
    completed: false,
  },
  { title: 'Responder os e-mails do cliente', description: null, completed: true },
  {
    title: 'Preparar a apresentação de sexta',
    description: 'Slides com os resultados do mês',
    completed: false,
  },
];

/**
 * Idempotent: creates the demo user if missing, hands any ownerless task (created before
 * accounts existed) to it, and adds sample tasks only when the demo user has none.
 */
export async function seed(log: (message: string) => void = console.log): Promise<void> {
  const demo = (await userRepository.findByEmail(DEMO_USER.email)) ?? (await register(DEMO_USER));
  if (!demo) throw new Error('Could not create the demo user');

  const [adopted] = await pool.query<ResultSetHeader>(
    'UPDATE tasks SET user_id = ? WHERE user_id IS NULL',
    [demo.id],
  );
  if (adopted.affectedRows > 0) {
    log(`${adopted.affectedRows} task(s) without owner assigned to ${DEMO_USER.email}`);
  }

  const [[{ total }]] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM tasks WHERE user_id = ?',
    [demo.id],
  );
  if (total === 0) {
    for (const task of SAMPLE_TASKS) {
      await pool.query(
        'INSERT INTO tasks (user_id, title, description, completed) VALUES (?, ?, ?, ?)',
        [demo.id, task.title, task.description, task.completed],
      );
    }
    log(`${SAMPLE_TASKS.length} sample tasks created`);
  }
  log(`demo user ready: ${DEMO_USER.email} / ${DEMO_USER.password}`);
}

if (require.main === module) {
  seed()
    .catch((error: unknown) => {
      console.error('Seed failed:', error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
