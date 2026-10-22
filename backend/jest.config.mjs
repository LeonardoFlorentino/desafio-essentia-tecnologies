/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup-mongo.ts'],
  globalSetup: '<rootDir>/tests/global-setup.ts',
  // Integration tests share one database: run the files one after another.
  maxWorkers: 1,
};
