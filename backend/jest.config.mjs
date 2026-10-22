/** @type {import('jest').Config} */
const shared = { preset: 'ts-jest', testEnvironment: 'node' };

/** @type {import('jest').Config} */
export default {
  projects: [
    {
      ...shared,
      // No database: each module's dependencies are mocked. Runs in a few seconds.
      displayName: 'unit',
      roots: ['<rootDir>/src', '<rootDir>/tests/unit'],
      setupFiles: ['<rootDir>/tests/unit/setup-env.ts'],
    },
    {
      ...shared,
      // Real HTTP requests against the test databases (todo_test in MySQL and MongoDB).
      displayName: 'integration',
      roots: ['<rootDir>/src', '<rootDir>/tests/integration'],
      setupFiles: ['<rootDir>/tests/setup-env.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup-mongo.ts'],
      globalSetup: '<rootDir>/tests/global-setup.ts',
    },
  ],
  // Integration tests share one database: run the files one after another.
  maxWorkers: 1,
  collectCoverageFrom: [
    'src/**/*.ts',
    // Process entry points: opening the port and the CLI wrappers run in Docker, not in Jest.
    '!src/server.ts',
  ],
  coverageThreshold: {
    global: { lines: 90, statements: 90, functions: 90, branches: 80 },
  },
};
