import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import catalogRoutes from './routes/catalog.js';
import programRoutes from './routes/programs.js';
import logRoutes from './routes/logs.js';
import progressRoutes from './routes/progress.js';

/**
 * The API, with no server attached.
 *
 * Split out so the same app can be listened on locally and exported as a
 * serverless handler in production without either one carrying the other's
 * assumptions. Notably there is no static-file serving here: on Vercel the
 * built client is served from the CDN and never touches this function.
 */
export function createApp() {
  const app = express();

  // Same-origin in production — the client is served from the same domain — so
  // this is only doing work for the Vite dev server on another port.
  app.use(cors({ origin: process.env.OVERLOAD_CORS_ORIGIN || true }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/catalog', catalogRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/logs', logRoutes);
  app.use('/api/progress', progressRoutes);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown endpoint' }));

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Something broke on the server.' });
  });

  return app;
}

export default createApp();
