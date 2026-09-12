/**
 * Vercel entry point.
 *
 * Every request under /api is rewritten here by vercel.json and handed to the
 * Express app unchanged, so routing, middleware and error handling stay in one
 * place rather than being reimplemented per function.
 */
import app from '../server/src/app.js';

export default app;
