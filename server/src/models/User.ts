// A player account. Sign-in uses the unique email; the explorer name does not need to be unique.
import { Schema, model, type HydratedDocument } from 'mongoose';

export interface IUser {
  email: string;
  explorerName: string;
  passwordHash: string;
  preferences: { sound: boolean; music: boolean; reducedMotion: boolean; timedMode: boolean };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    explorerName: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    preferences: {
      sound: { type: Boolean, default: false },
      music: { type: Boolean, default: false },
      reducedMotion: { type: Boolean, default: false },
      timedMode: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', userSchema);
export type UserDoc = HydratedDocument<IUser>;
