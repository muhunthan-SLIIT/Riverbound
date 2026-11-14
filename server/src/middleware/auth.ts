// Session cookie handling and the "must be signed in" check.
import type { NextFunction, Request, Response } from 'express';
import type { Types } from 'mongoose';
import type { UserDoc } from '../models/index.ts';
import { findUserBySessionToken } from '../services/auth.service.ts';
import { unauthenticated } from '../utils/errors.ts';

export const SESSION_COOKIE = 'rb_session';

/** Reads one cookie from the Cookie header (no extra library needed). */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

export function setSessionCookie(res: Response, token: string, days: number, secure: boolean): void {
  // HttpOnly: JavaScript in the page cannot read it. SameSite=Lax: other sites cannot send it on POSTs.
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: days * 86_400_000 });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** Blocks the request with 401 unless a valid session cookie is present. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE);
  const user = token ? await findUserBySessionToken(token) : null;
  if (!user) throw unauthenticated();
  res.locals.user = user;
  next();
}

/** The signed-in user. The player's identity always comes from the session, never from the request body. */
export function currentUser(res: Response): UserDoc {
  const user = res.locals.user as UserDoc | undefined;
  if (!user) throw unauthenticated();
  return user;
}

export function currentUserId(res: Response): Types.ObjectId {
  return currentUser(res)._id;
}
