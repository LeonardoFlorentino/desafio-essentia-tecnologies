// setup-env must be imported first: it selects the test database before src/config.ts loads.
import './setup-env';
import { migrate } from '../src/db/migrate';

/** Brings the test database schema up to date once, before any test file runs. */
export default async function globalSetup() {
  try {
    await migrate(() => {});
  } catch (error) {
    throw new Error(
      `Could not prepare the test database "${process.env.DB_NAME}". Is MySQL running ` +
        '(docker compose up -d)? If the volume predates the test database, recreate it with ' +
        '"docker compose down -v".',
      { cause: error },
    );
  }
}
