// Tests for the Google sign-in checks (no network or database needed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildGoogleAuthUrl, explorerNameFromGoogle, newGoogleLoginAttempt, readGoogleIdToken } from '../src/utils/google.ts';

const CLIENT = 'riverbound-test.apps.googleusercontent.com';
const NOW = 1_800_000_000;

/** A fake ID token with the given claims (the signature part is not checked: see utils/google.ts). */
function token(claims: Record<string, unknown>): string {
  const part = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${part({ alg: 'RS256' })}.${part(claims)}.signature`;
}
const good = { iss: 'https://accounts.google.com', aud: CLIENT, exp: NOW + 600, sub: '1234567890', email: 'Alex@Example.com', email_verified: true, given_name: 'Alex', name: 'Alex River' };

test('google: a valid ID token gives the account ID and a lower-case email', () => {
  const claims = readGoogleIdToken(token(good), CLIENT, NOW);
  assert.deepEqual(claims, { sub: '1234567890', email: 'alex@example.com', name: 'Alex River', givenName: 'Alex' });
});

test('google: tokens for another app, from another issuer, expired or with an unverified email are refused', () => {
  assert.throws(() => readGoogleIdToken(token({ ...good, aud: 'someone-else' }), CLIENT, NOW), /another app/);
  assert.throws(() => readGoogleIdToken(token({ ...good, iss: 'https://evil.example' }), CLIENT, NOW), /issuer/);
  assert.throws(() => readGoogleIdToken(token({ ...good, exp: NOW - 1 }), CLIENT, NOW), /expired/);
  assert.throws(() => readGoogleIdToken(token({ ...good, email_verified: false }), CLIENT, NOW), /verified/);
  assert.throws(() => readGoogleIdToken(token({ ...good, sub: '' }), CLIENT, NOW), /account ID/);
  assert.throws(() => readGoogleIdToken('not-a-token', CLIENT, NOW), /Malformed/);
  assert.throws(() => readGoogleIdToken(undefined, CLIENT, NOW), /No ID token/);
});

test('google: each attempt has a fresh state, and the PKCE challenge is the SHA-256 of the verifier', () => {
  const a = newGoogleLoginAttempt();
  const b = newGoogleLoginAttempt();
  assert.notEqual(a.state, b.state);
  assert.equal(a.challenge, createHash('sha256').update(a.verifier).digest('base64url'));
  const url = new URL(buildGoogleAuthUrl({ clientId: CLIENT, clientSecret: 'secret', redirectUri: 'http://localhost:5173/api/auth/google/callback' }, a.state, a.challenge));
  assert.equal(url.searchParams.get('state'), a.state);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.ok(!url.toString().includes('secret'), 'the client secret never goes to the browser');
  assert.ok(!url.toString().includes(a.verifier), 'the PKCE verifier never goes to the browser');
});

test('google: explorer name comes from the profile and always fits 2-30 characters', () => {
  assert.equal(explorerNameFromGoogle({ givenName: 'Alex', name: 'Alex River', email: 'a@x.com' }, 2, 30), 'Alex');
  assert.equal(explorerNameFromGoogle({ givenName: null, name: 'A', email: 'muhunthan@x.com' }, 2, 30), 'muhunthan');
  assert.equal(explorerNameFromGoogle({ givenName: 'X'.repeat(50), name: null, email: 'a@x.com' }, 2, 30).length, 30);
  assert.equal(explorerNameFromGoogle({ givenName: ' ', name: null, email: 'a@x.com' }, 2, 30), 'Explorer');
});
