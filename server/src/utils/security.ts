// Password hashing and random tokens, using only Node's built-in crypto module.
import { createHash, randomBytes, scrypt, timingSafeEqual, randomInt } from 'node:crypto';

const KEY_LENGTH = 64;
// scrypt cost settings: N=2^15 is a memory-hard setting suitable for a web login.
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Returns "salt:hash" in hex. The password itself is never stored. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, keyHex] = stored.split(':');
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** A long random session token. Only its SHA-256 hash is saved in the database. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** A random seed for generating feeding questions. */
export function randomSeed(): number {
  return randomInt(0, 2 ** 31);
}
