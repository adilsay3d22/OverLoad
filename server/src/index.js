import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import app from './app.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(HERE, '../../client/dist');
// Deliberately not `PORT`: dev launchers inject that for the web server, and
// the API would silently fight Vite for the same port.
const PORT = Number(process.env.OVERLOAD_PORT) || 4000;

// Local production preview only. On Vercel the client is static and this file
// is never loaded.
if (fs.existsSync(CLIENT_DIST)) {
  const express = (await import('express')).default;
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Overload API listening on http://localhost:${PORT}`);
});
