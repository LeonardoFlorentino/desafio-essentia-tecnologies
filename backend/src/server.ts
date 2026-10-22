import { config } from './config';
import { createApp } from './app';
import { purgeExpired } from './auth/revoked-tokens';
import { connectMongo } from './db/mongo';
import { logger } from './logger';

async function start() {
  // MySQL connects lazily through its pool; MongoDB is connected up front so a wrong URL or
  // a stopped container shows up at startup instead of on the first request that needs it.
  await connectMongo();
  // Revocations of tokens that have expired anyway are dead weight: drop them on every start.
  const purged = await purgeExpired();
  if (purged > 0) logger.info({ purged }, 'expired token revocations removed');
  createApp().listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port}`);
  });
}

start().catch((error: unknown) => {
  logger.fatal({ err: error }, 'API failed to start');
  process.exit(1);
});
