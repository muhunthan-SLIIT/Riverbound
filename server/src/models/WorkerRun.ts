// Records of worker jobs, plus a "lease" so two copies of the same job never run at once.
import { Schema, model } from 'mongoose';

export interface IWorkerRun {
  job: string;
  status: 'success' | 'failed';
  added: number;
  message: string;
  startedAt: Date;
  finishedAt: Date;
}

const workerRunSchema = new Schema<IWorkerRun>({
  job: { type: String, required: true, index: true },
  status: { type: String, enum: ['success', 'failed'], required: true },
  added: { type: Number, default: 0 },
  message: { type: String, default: '' },
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date, required: true },
});

export const WorkerRun = model<IWorkerRun>('WorkerRun', workerRunSchema);

export interface ILease {
  _id: string; // job name
  holder: string;
  expiresAt: Date;
}

const leaseSchema = new Schema<ILease>({
  _id: { type: String, required: true },
  holder: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

export const Lease = model<ILease>('Lease', leaseSchema);
