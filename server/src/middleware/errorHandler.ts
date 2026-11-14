// Turns any error into a safe JSON response: { error: { code, message } }.
// Unexpected errors are logged on the server but never shown to the player.
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.ts';

export function notFoundRoute(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'This address does not exist.' } });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  // Body was not valid JSON.
  if (typeof error === 'object' && error !== null && (error as { type?: unknown }).type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'Request body is not valid JSON.' } });
    return;
  }
  // Two tabs changed the same save at once (Mongoose version check).
  if (typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'VersionError') {
    res.status(409).json({ error: { code: 'STALE', message: 'Your game changed in another tab. Please refresh.' } });
    return;
  }
  console.error('Unexpected error:', error instanceof Error ? error.stack : error);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
}
