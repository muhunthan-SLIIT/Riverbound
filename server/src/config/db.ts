// Connects to MongoDB with Mongoose. Used by both the API server and the worker.
import mongoose from 'mongoose';

export async function connectDatabase(uri: string, dbName: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10_000 });
  // Build the unique indexes (they protect against duplicate rewards and double campaigns).
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
