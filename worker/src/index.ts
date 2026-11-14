// The Riverbound worker: a SEPARATE program from the API server.
// It talks to the external APIs on a schedule and stores results in MongoDB.
// If the worker stops, the game keeps working with the puzzles and sounds already saved.
import cron from 'node-cron';
import { connectDatabase, disconnectDatabase } from '@riverbound/server/db';
import '@riverbound/server/models';
import { runJob } from './jobs/lease.ts';
import { ensureLocalScenes } from './jobs/localScenes.ts';
import { refillPuzzles } from './jobs/refillPuzzles.ts';
import { refreshSounds } from './jobs/refreshSounds.ts';

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value || value.includes('<')) throw new Error(`Missing environment variable ${name}. Copy worker/.env.example to worker/.env.`);
  return value;
}

async function main(): Promise<void> {
  const settings = {
    mongodbUri: env('MONGODB_URI'),
    dbName: env('MONGODB_DB_NAME', 'riverbound'),
    fishApiUrl: env('FISH_API_URL', 'https://marcconrad.com/uob/fish/api.php'),
    poolSize: Number(env('PUZZLE_POOL_SIZE', '40')),
    puzzleCron: env('PUZZLE_CRON', '*/10 * * * *'),
    soundCron: env('SOUND_CRON', '0 3 * * *'),
    timezone: env('WORKER_TIMEZONE', 'Asia/Colombo'),
    freesoundKey: process.env.FREESOUND_API_KEY || undefined,
  };

  await connectDatabase(settings.mongodbUri, settings.dbName);
  console.log('Worker connected to MongoDB.');

  const puzzles = () =>
    runJob('refill-puzzles', 10 * 60_000, () =>
      refillPuzzles({ baseUrl: settings.fishApiUrl, targetPoolSize: settings.poolSize, maxPerRun: 10, maxRetries: 3 }),
    );
  const sounds = () => runJob('refresh-sounds', 5 * 60_000, () => refreshSounds(settings.freesoundKey));

  // On start-up: make sure fallback puzzles exist, then fill the pools.
  await runJob('local-scenes', 60_000, () => ensureLocalScenes(24));
  await puzzles();
  await sounds();

  cron.schedule(settings.puzzleCron, puzzles, { timezone: settings.timezone });
  cron.schedule(settings.soundCron, sounds, { timezone: settings.timezone });
  console.log(`Worker scheduled: puzzles "${settings.puzzleCron}", sounds "${settings.soundCron}" (${settings.timezone}).`);

  const shutdown = async () => {
    await disconnectDatabase();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('Worker failed to start:', error instanceof Error ? error.message : error);
  process.exit(1);
});
