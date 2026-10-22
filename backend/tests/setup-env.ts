// Point the app at the test database before src/config.ts reads the environment
// (variables already set take precedence over backend/.env).
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'todo_test';
