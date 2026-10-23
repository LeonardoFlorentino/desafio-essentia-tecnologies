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

// The example secrets are public (they are in the repository): anyone could sign tokens with them.
if (process.env.NODE_ENV === 'production' && /change-me/i.test(process.env.JWT_SECRET!)) {
  throw new Error('JWT_SECRET is an example value from the repository: set a random secret.');
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
    // Managed MySQL (Aiven) only accepts TLS, with a certificate signed by its own authority:
    // DB_SSL_CA holds that CA certificate (PEM; "\n" written literally also works, for panels that
    // keep values on one line). Local Docker MySQL needs none.
    ssl: process.env.DB_SSL_CA
      ? { ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'), rejectUnauthorized: true }
      : undefined,
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
  // trace, debug, info, warn, error, fatal or silent (the tests use silent).
  logLevel: process.env.LOG_LEVEL ?? 'info',
  // Login failures and sign-ups allowed per IP per minute before answering 429.
  authAttemptsPerMinute: Number(process.env.AUTH_ATTEMPTS_PER_MINUTE ?? 5),
  // Which proxies in front of the API may report the client IP in X-Forwarded-For; without a proxy
  // that header is set by the client and could be faked. A count (nginx in Docker = 1) or, when the
  // number of hops varies (Render: one more through the static site's rewrite), Express's list of
  // trusted networks, e.g. "loopback, uniquelocal": every local or private hop is skipped and the
  // first public address is the client's.
  trustProxy: /^\d+$/.test(process.env.TRUST_PROXY ?? '0')
    ? Number(process.env.TRUST_PROXY ?? 0)
    : process.env.TRUST_PROXY!,
  // HTTPS-only session cookie: on by default in production, but COOKIE_SECURE=false allows a
  // production build served over plain HTTP on localhost (docker compose).
  secureCookies:
    (process.env.COOKIE_SECURE ?? String(process.env.NODE_ENV === 'production')) === 'true',
};
