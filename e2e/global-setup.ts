import { execSync } from 'node:child_process';
import path from 'node:path';

/** Empties the test database (todo_test) once, before the tests run. */
export default function globalSetup() {
  execSync('npx tsx tests/reset-test-db.ts', {
    cwd: path.join(__dirname, '..', 'backend'),
    stdio: 'inherit',
  });
}
