// Unit tests never open a connection: src/config.ts only needs the variables to exist. Set before
// it loads, so backend/.env (which never overrides existing variables) has no say here either.
process.env.DB_HOST = 'unit-tests-use-no-database';
process.env.DB_USER = 'unit';
process.env.DB_PASSWORD = 'unit';
process.env.DB_NAME = 'unit';
process.env.MONGO_URL = 'mongodb://unit-tests-use-no-database';
process.env.JWT_SECRET = 'unit-test-secret-unit-test-secret-0123456789';
process.env.JWT_EXPIRES_IN = '1h';
process.env.LOG_LEVEL = 'silent';
