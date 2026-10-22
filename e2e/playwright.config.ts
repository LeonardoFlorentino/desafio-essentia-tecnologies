import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Own ports and the test database: the E2E run never touches the dev servers (3000/4200) or the
// development data, and can run while they are up.
const API_PORT = 3100;
const WEB_PORT = 4300;

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  // Each test signs up its own account, so tests do not see each other's tasks. One worker keeps
  // memory low (two dev servers + a browser); CI can raise it.
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  // Both at the repository root, where .gitignore and the CI artifact upload expect them.
  outputDir: path.join(__dirname, '..', 'test-results'),
  reporter: process.env.CI
    ? [
        ['list'],
        ['html', { open: 'never', outputFolder: path.join(__dirname, '..', 'playwright-report') }],
      ]
    : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Variables not set here come from backend/.env (or from the CI environment).
      // Migrations first: Playwright starts the web servers *before* globalSetup, and on a fresh
      // database (CI) the API would fail at startup on missing tables.
      command: 'npx tsx src/db/migrate.ts && npx tsx src/server.ts',
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/api/health/ready`,
      env: {
        PORT: String(API_PORT),
        DB_NAME: 'todo_test',
        MONGO_DB_NAME: 'todo_test',
        // Every test signs in from the same address.
        AUTH_ATTEMPTS_PER_MINUTE: '1000',
        LOG_LEVEL: 'warn',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: `npx ng serve --port ${WEB_PORT} --proxy-config ../e2e/proxy.conf.json`,
      cwd: '../frontend',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
