// Point the app at the test databases before src/config.ts reads the environment
// (variables already set take precedence over backend/.env).
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'todo_test';
process.env.MONGO_DB_NAME = process.env.TEST_MONGO_DB_NAME ?? 'todo_test';
// Every test signs up and logs in from the same address; rate-limit.test.ts sets its own limit.
process.env.AUTH_ATTEMPTS_PER_MINUTE = '1000';
// Request logs would bury the test report; log-capturing tests pass their own logger.
process.env.LOG_LEVEL = 'silent';
