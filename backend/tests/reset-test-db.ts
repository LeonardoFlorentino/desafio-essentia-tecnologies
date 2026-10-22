// Used by the E2E tests (e2e/global-setup.ts): brings the test database (todo_test in MySQL and
// MongoDB) up to date and empties it, so every E2E run starts from nothing.
// setup-env must be imported first: it selects the test database before src/config.ts loads.
import './setup-env';
import mongoose from 'mongoose';
import { connectMongo, disconnectMongo } from '../src/db/mongo';
import { migrate } from '../src/db/migrate';
import { pool } from '../src/db/mysql';

async function reset() {
  await migrate(() => {});
  // Tasks go with their users (ON DELETE CASCADE).
  await pool.query('DELETE FROM users');
  await pool.query('DELETE FROM revoked_tokens');
  await connectMongo();
  await mongoose.connection.dropDatabase();
}

reset()
  .then(() => console.log(`test database ${process.env.DB_NAME} reset`))
  .catch((error: unknown) => {
    console.error(
      'Could not reset the test database (is "docker compose up -d mysql mongo" running?)',
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    await disconnectMongo();
  });
