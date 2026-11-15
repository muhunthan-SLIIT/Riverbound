// A player account. Sign-in uses the unique email (with a password) or a Google account.
// The explorer name does not need to be unique.
import { Schema, model, type HydratedDocument } from 'mongoose';

export interface IUser {
  email: string;
  explorerName: string;
  passwordHash: string | null; // null for accounts made with Google that never set a password
  googleId: string | null; // Google's account ID ("sub"), set when the player signs in with Google
  preferences: { sound: boolean; music: boolean; reducedMotion: boolean; timedMode: boolean };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    explorerName: { type: String, required: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null },
    preferences: {
      sound: { type: Boolean, default: false },
      music: { type: Boolean, default: false },
      reducedMotion: { type: Boolean, default: false },
      timedMode: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

// One Google account links to one player. Only real IDs are indexed, so many null values are fine.
userSchema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } });

export const User = model<IUser>('User', userSchema);
export type UserDoc = HydratedDocument<IUser>;
