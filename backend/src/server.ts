import { config } from './config';
import { createApp } from './app';
import { connectMongo } from './db/mongo';

async function start() {
  // MySQL connects lazily through its pool; MongoDB is connected up front so a wrong URL or
  // a stopped container shows up at startup instead of on the first request that needs it.
  await connectMongo();
  createApp().listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

start().catch((error: unknown) => {
  console.error('API failed to start:', error);
  process.exit(1);
});
