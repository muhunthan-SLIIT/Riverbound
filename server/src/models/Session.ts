// A signed-in session. The browser cookie holds a random token; we store only its hash.
// Deleting the session (sign out) makes the cookie useless straight away.
import { Schema, model, type Types } from 'mongoose';

export interface ISession {
  tokenHash: string;
  user: Types.ObjectId;
  expiresAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    tokenHash: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // TTL index: MongoDB deletes the session automatically after it expires.
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export const Session = model<ISession>('Session', sessionSchema);
