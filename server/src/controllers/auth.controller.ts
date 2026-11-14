// HTTP handlers for /api/auth/*. They read the request, call the service and send JSON.
import type { Request, Response } from 'express';
import type { Env } from '../config/env.ts';
import { clearSessionCookie, currentUser, readCookie, SESSION_COOKIE, setSessionCookie } from '../middleware/auth.ts';
import * as auth from '../services/auth.service.ts';
import { asObject } from '../utils/validate.ts';

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
  };
}
