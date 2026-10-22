// Point the app at the test databases before src/config.ts reads the environment
// (variables already set take precedence over backend/.env).
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'todo_test';
process.env.MONGO_DB_NAME = process.env.TEST_MONGO_DB_NAME ?? 'todo_test';
