try {
  process.loadEnvFile();
} catch (error) {
  // No .env file is fine: variables may come from the environment (Docker, CI).
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

const requiredVariables = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'] as const;
const missing = requiredVariables.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. ` +
      'Copy backend/.env.example to backend/.env and fill in the values.',
  );
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
};
