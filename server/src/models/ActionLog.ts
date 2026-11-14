// Remembers every reward-giving request by its Idempotency-Key.
// If the same request arrives again (double click, network retry), we return the saved result
// instead of paying the reward a second time.
import { Schema, model, type Types } from 'mongoose';

export interface IActionLog {
  owner: Types.ObjectId;
  key: string;
  operation: string;
  payloadHash: string;
  response: unknown;
  createdAt: Date;
}

const actionLogSchema = new Schema<IActionLog>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, required: true },
    operation: { type: String, required: true },
    payloadHash: { type: String, required: true },
    response: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

actionLogSchema.index({ owner: 1, key: 1 }, { unique: true });

export const ActionLog = model<IActionLog>('ActionLog', actionLogSchema);
