// Starts the Riverbound API server: connect to MongoDB, then listen for requests.
import { createApp } from './app.ts';
import { connectDatabase, disconnectDatabase } from './config/db.ts';
import { loadEnv } from './config/env.ts';
import './models/index.ts'; // register all models before indexes are built

async function main(): Promise<void> {
  const env = loadEnv();
  await connectDatabase(env.mongodbUri, env.mongodbDbName);
  console.log(`Connected to MongoDB database "${env.mongodbDbName}".`);

  const server = createApp(env).listen(env.port, () => {
    console.log(`Riverbound API listening on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    server.close();
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('Server failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
