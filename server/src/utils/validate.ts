// Small input checks used by the controllers. Every request body is untrusted.
import { Types } from 'mongoose';
import { badRequest } from './errors.ts';

export function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw badRequest('Request body must be a JSON object.');
  return body as Record<string, unknown>;
}

export function requireString(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== 'string') throw badRequest(`${field} is required.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) throw badRequest(`${field} must be ${min}-${max} characters.`);
  return trimmed;
}

export function requireEmail(value: unknown): string {
  const email = requireString(value, 'Email', 3, 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Please enter a valid email address.');
  return email;
}

export function requirePositiveInt(value: unknown, field: string, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw badRequest(`${field} must be a whole number from 1 to ${max}.`);
  }
  return value;
}

export function requireObjectId(value: unknown): Types.ObjectId {
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) throw badRequest('Invalid id.');
  return new Types.ObjectId(value);
}

/** Every reward-giving request carries an Idempotency-Key so a repeated request never pays twice. */
export function requireActionKey(header: string | undefined): string {
  if (!header || !/^[A-Za-z0-9-]{8,100}$/.test(header)) throw badRequest('Missing or invalid Idempotency-Key header.');
  return header;
}
