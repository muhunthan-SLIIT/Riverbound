// Google sign-in helpers (OAuth 2.0 "authorization code" flow with PKCE). No extra packages:
// only Node's built-in crypto and fetch.
//
// The flow:
//   1. The browser opens /api/auth/google/start. We make a random `state` and a PKCE `verifier`,
//      keep them in a short-lived HttpOnly cookie, and redirect to Google's sign-in page.
//   2. Google sends the browser back to /api/auth/google/callback?code=...&state=...
//   3. We check `state` matches the cookie (stops another site from logging you into ITS account),
//      then swap the code for tokens directly with Google (server to server, with our client secret
//      and the PKCE verifier).
//   4. We read the ID token's claims (who the user is). The token came straight from Google over
//      HTTPS in step 3, so OpenID Connect allows trusting it without checking its signature; we still
//      check the issuer, audience (our client ID), expiry and that Google verified the email.
import { createHash, randomBytes } from 'node:crypto';

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string };

export type GoogleClaims = { sub: string; email: string; name: string | null; givenName: string | null };

export class GoogleSignInError extends Error {}

/** A random `state` and PKCE verifier, plus the challenge Google needs (SHA-256 of the verifier). */
export function newGoogleLoginAttempt(): { state: string; verifier: string; challenge: string } {
  const state = randomBytes(24).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { state, verifier, challenge };
}

export function buildGoogleAuthUrl(config: GoogleConfig, state: string, challenge: string): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

/** Reads and checks the claims inside an ID token received directly from Google's token endpoint. */
export function readGoogleIdToken(idToken: unknown, clientId: string, nowSeconds: number): GoogleClaims {
  if (typeof idToken !== 'string') throw new GoogleSignInError('No ID token');
  const parts = idToken.split('.');
  if (parts.length !== 3 || !parts[1]) throw new GoogleSignInError('Malformed ID token');
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    throw new GoogleSignInError('Unreadable ID token');
  }
  if (typeof claims.iss !== 'string' || !GOOGLE_ISSUERS.includes(claims.iss)) throw new GoogleSignInError('Wrong issuer');
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audience.includes(clientId)) throw new GoogleSignInError('Token is for another app');
  if (typeof claims.exp !== 'number' || claims.exp <= nowSeconds) throw new GoogleSignInError('Token expired');
  if (typeof claims.sub !== 'string' || claims.sub.length === 0) throw new GoogleSignInError('No Google account ID');
  if (typeof claims.email !== 'string' || claims.email_verified !== true) {
    throw new GoogleSignInError('Google has not verified this email');
  }
  return {
    sub: claims.sub,
    email: claims.email.trim().toLowerCase(),
    name: typeof claims.name === 'string' ? claims.name : null,
    givenName: typeof claims.given_name === 'string' ? claims.given_name : null,
  };
}

/** Step 3: swaps the one-time code for tokens, server to server. */
export async function exchangeGoogleCode(config: GoogleConfig, code: string, verifier: string): Promise<GoogleClaims> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new GoogleSignInError(`Google token exchange failed (${response.status})`);
  const body = (await response.json()) as { id_token?: unknown };
  return readGoogleIdToken(body.id_token, config.clientId, Math.floor(Date.now() / 1000));
}

/** A valid explorer name (2-30 characters) from the Google profile. */
export function explorerNameFromGoogle(claims: Pick<GoogleClaims, 'givenName' | 'name' | 'email'>, min: number, max: number): string {
  for (const candidate of [claims.givenName, claims.name, claims.email.split('@')[0]]) {
    const name = (candidate ?? '').replace(/\s+/g, ' ').trim().slice(0, max).trim();
    if (name.length >= min) return name;
  }
  return 'Explorer';
}
