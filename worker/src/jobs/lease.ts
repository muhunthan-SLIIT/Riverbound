// A "lease" makes sure only one copy of a job runs at a time, even with two workers running.
import { randomUUID } from 'node:crypto';
import { Lease, WorkerRun } from '@riverbound/server/models';

const HOLDER = randomUUID();

async function acquire(job: string, ttlMs: number): Promise<boolean> {
  const now = new Date();
  try {
    // Take the lease if nobody holds it or the old one has expired.
    const lease = await Lease.findOneAndUpdate(
      { _id: job, $or: [{ expiresAt: { $lt: now } }, { holder: HOLDER }] },
      { holder: HOLDER, expiresAt: new Date(now.getTime() + ttlMs) },
      { upsert: true, new: true },
    );
    return lease?.holder === HOLDER;
  } catch (error) {
    if ((error as { code?: unknown }).code === 11000) return false; // someone else holds it
    throw error;
  }
}

async function release(job: string): Promise<void> {
  await Lease.deleteOne({ _id: job, holder: HOLDER });
}

/** Runs a job under a lease and records the result in the workerRuns collection. */
export async function runJob(job: string, ttlMs: number, work: () => Promise<{ added: number; message: string }>): Promise<void> {
  if (!(await acquire(job, ttlMs))) {
    console.log(`[${job}] skipped: already running elsewhere`);
    return;
  }
  const startedAt = new Date();
  try {
    const { added, message } = await work();
    await WorkerRun.create({ job, status: 'success', added, message, startedAt, finishedAt: new Date() });
    console.log(`[${job}] ok: ${message}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await WorkerRun.create({ job, status: 'failed', added: 0, message, startedAt, finishedAt: new Date() });
    console.error(`[${job}] failed: ${message}`);
  } finally {
    await release(job);
  }
}
