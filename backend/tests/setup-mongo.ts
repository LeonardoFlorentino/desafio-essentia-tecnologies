import { afterAll, beforeAll } from '@jest/globals';
import { connectMongo, disconnectMongo } from '../src/db/mongo';

// Every test file talks to the app as the server would: with MongoDB connected.
beforeAll(async () => {
  await connectMongo();
});

afterAll(async () => {
  await disconnectMongo();
});
