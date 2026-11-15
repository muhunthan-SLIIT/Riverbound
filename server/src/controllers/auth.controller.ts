// HTTP handlers for /api/auth/*. They read the request, call the service and send JSON.
import type { Request, Response } from 'express';
import type { Env } from '../config/env.ts';
import { clearSessionCookie, currentUser, readCookie, SESSION_COOKIE, setSessionCookie } from '../middleware/auth.ts';
import * as auth from '../services/auth.service.ts';
import { buildGoogleAuthUrl, exchangeGoogleCode, GoogleSignInError, newGoogleLoginAttempt } from '../utils/google.ts';
import { asObject } from '../utils/validate.ts';

/** Holds the Google `state` and PKCE verifier between the start and the callback (10 minutes). */
const GOOGLE_COOKIE = 'rb_google';
const GOOGLE_COOKIE_PATH = '/api/auth/google';

export function authController(env: Env) {
  return {
    async register(req: Request, res: Response) {
      const { user, token } = await auth.register(asObject(req.body), env.sessionDays);
      setSessionCookie(res, token, env.sessionDays, env.isProduction);
      res.status(201).json({ user });
    },

    async login(req: Request, res: Response) {
      const { user, token } = await auth.login(asObject(req.body), env.sessionDays);
      setSessionCookie(res, token, env.sessionDays, env.isProduction);
      res.json({ user });
    },

    async logout(req: Request, res: Response) {
      await auth.logout(readCookie(req, SESSION_COOKIE));
      clearSessionCookie(res);
      res.json({ ok: true });
    },

    session(_req: Request, res: Response) {
      res.json({ user: auth.toUserDTO(currentUser(res)) });
    },

    /** Which sign-in buttons work on this server. Apple is not set up (it needs a paid Apple developer account). */
    providers(_req: Request, res: Response) {
      res.json({ google: env.google !== null, apple: false });
    },

    /** Step 1: send the browser to Google's sign-in page. */
    googleStart(_req: Request, res: Response) {
      if (!env.google) return res.redirect(`${env.appOrigin}/login?error=google_off`);
      const attempt = newGoogleLoginAttempt();
      // SameSite=Lax: the cookie still comes back when Google redirects the browser to us (a normal link).
      res.cookie(GOOGLE_COOKIE, `${attempt.state}.${attempt.verifier}`, {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        path: GOOGLE_COOKIE_PATH,
        maxAge: 10 * 60_000,
      });
      res.redirect(buildGoogleAuthUrl(env.google, attempt.state, attempt.challenge));
    },

    /** Step 2: Google sends the browser back here. Sign in, then go to the game (or back to Sign In with an error). */
    async googleCallback(req: Request, res: Response) {
      const back = (error: string) => res.redirect(`${env.appOrigin}/login?error=${error}`);
      const saved = readCookie(req, GOOGLE_COOKIE);
      res.clearCookie(GOOGLE_COOKIE, { path: GOOGLE_COOKIE_PATH });
      if (!env.google) return back('google_off');
      if (req.query.error) return back('google_cancelled'); // the player pressed Cancel on Google's page

      const [state, verifier] = (saved ?? '').split('.');
      const code = req.query.code;
      if (!state || !verifier || req.query.state !== state || typeof code !== 'string' || code.length > 2048) {
        return back('google_expired');
      }
      try {
        const claims = await exchangeGoogleCode(env.google, code, verifier);
        const { token, created } = await auth.signInWithGoogle(claims, env.sessionDays);
        setSessionCookie(res, token, env.sessionDays, env.isProduction);
        res.redirect(`${env.appOrigin}${created ? '/campaigns/new' : '/campaigns'}`);
      } catch (error) {
        const code = (error as { code?: unknown }).code;
        if (code === 'EMAIL_TAKEN') return back('google_email_taken');
        if (!(error instanceof GoogleSignInError)) console.error('[google] sign-in failed:', (error as Error).message);
        return back('google_failed');
      }
    },
  };
}
