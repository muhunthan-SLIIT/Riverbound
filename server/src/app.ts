// Builds the Express application: middleware first, then routes, then error handling.
import express from 'express';
import type { Env } from './config/env.ts';
import { errorHandler, notFoundRoute } from './middleware/errorHandler.ts';
import { requestLogger, sameOriginOnly } from './middleware/security.ts';
import { buildRoutes } from './routes/index.ts';

export function createApp(env: Env): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  app.use(requestLogger);
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', sameOriginOnly(env.appOrigin), buildRoutes(env));

  app.use(notFoundRoute);
  app.use(errorHandler);
  return app;
}
