import os from 'node:os';
import mongoose from 'mongoose';
import { config } from '../config';

/** Opens the MongoDB connection used by the mongoose models; fails fast if the server is not there. */
export async function connectMongo(): Promise<void> {
  await mongoose.connect(config.mongo.url, {
    dbName: config.mongo.database,
    serverSelectionTimeoutMS: 5000,
    // The driver loads `os` with a dynamic import() to describe the client in its handshake. Where
    // that import is unavailable (Jest's CommonJS sandbox) the handshake goes out empty and the
    // server rejects it ("Missing required sub-document 'driver'"); handing it over avoids that.
    runtimeAdapters: { os },
  });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

/** Round trip to the server (not just the connection state), for the health check. */
export async function pingMongo(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB is not connected');
  await db.admin().ping();
}
