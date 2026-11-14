// Tests for password hashing and tokens (no database needed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, newSessionToken, sha256, verifyPassword } from '../src/utils/security.ts';

test('password hash verifies the right password only', async () => {
  const stored = await hashPassword('river1234');
  assert.notEqual(stored, 'river1234');
  assert.equal(await verifyPassword('river1234', stored), true);
  assert.equal(await verifyPassword('river12345', stored), false);
});

test('the same password gives different hashes (random salt)', async () => {
  assert.notEqual(await hashPassword('river1234'), await hashPassword('river1234'));
});

test('session tokens are long, random and stored as a hash', () => {
  const a = newSessionToken();
  const b = newSessionToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 40);
  assert.equal(sha256(a).length, 64);
});
