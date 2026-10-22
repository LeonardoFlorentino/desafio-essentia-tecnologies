try {
  process.loadEnvFile();
} catch (error) {
  // No .env file is fine: variables may come from the environment (Docker, CI).
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const requiredVariables = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'MONGO_URL',
  'JWT_SECRET',
] as const;
const missing = requiredVariables.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy backend/.env.example to backend/.env and fill in the values.',
  );
}

// A short secret makes the token signature guessable by brute force.
if (process.env.JWT_SECRET!.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long.');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  // Browser origin allowed to call the API directly (the Angular dev server by default).
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  db: {
    host: process.env.DB_HOST!,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    database: process.env.DB_NAME!,
  },
  mongo: {
    url: process.env.MONGO_URL!,
    // Kept apart from the URL so the tests can point at their own database (todo_test).
    database: process.env.MONGO_DB_NAME ?? 'todo',
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    // Any format accepted by jsonwebtoken: "8h", "30m", "7d" or a number of seconds.
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  },
  // HTTPS-only session cookie: on by default in production, but COOKIE_SECURE=false allows a
  // production build served over plain HTTP on localhost (docker compose).
  secureCookies:
    (process.env.COOKIE_SECURE ?? String(process.env.NODE_ENV === 'production')) === 'true',
};
