// CSRF protection, simple rate limiting and request logging.
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.ts';

/**
 * CSRF protection for changes (POST/PATCH/DELETE):
 * - the body must be JSON (a normal HTML form on another site cannot send JSON), and
 * - if the browser sends an Origin header, it must be our own app.
 */
export function sameOriginOnly(appOrigin: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    const origin = req.headers.origin;
    if (origin && origin !== appOrigin) throw new AppError(403, 'FORBIDDEN_ORIGIN', 'Request blocked.');
    if (!req.is('application/json')) throw new AppError(415, 'JSON_REQUIRED', 'Requests must use JSON.');
    next();
  };
}

/** Allows at most `limit` requests per `windowMs` for each IP address (kept in memory). */
export function rateLimit(name: string, limit: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const id = `${name}:${req.ip ?? 'unknown'}`;
    const entry = hits.get(id);
    if (!entry || entry.resetAt <= now) {
      hits.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > limit) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString());
      throw new AppError(429, 'RATE_LIMITED', 'Too many requests. Please wait a moment.');
    }
    next();
  };
}

/** Logs method, path, status and time. Never logs bodies, cookies, passwords or answers. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = randomUUID();
  const started = Date.now();
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    console.log(JSON.stringify({ requestId, method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - started }));
  });
  next();
}
