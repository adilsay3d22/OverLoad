import jwt from 'jsonwebtoken';
import { findUserById } from './repo.js';

/**
 * In development the secret falls back to a known string so the app runs
 * straight from a clone. In production it must be set: a deployed build signing
 * sessions with a public constant is not authentication, so it refuses to start
 * rather than pretending.
 */
const SECRET = process.env.OVERLOAD_JWT_SECRET
  || (process.env.NODE_ENV === 'production' ? null : 'overload-dev-secret-change-me');

if (!SECRET) {
  throw new Error('OVERLOAD_JWT_SECRET must be set in production.');
}

const TTL = '30d';

export const signToken = (user) => jwt.sign({ sub: user.id }, SECRET, { expiresIn: TTL });

export const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, units: u.units, createdAt: u.createdAt,
});

/**
 * Authenticate from the token alone.
 *
 * This used to load the full user row on every authenticated request, which
 * meant a database round trip before any route had started doing its work. With
 * the function in one region and Neon in another that was a fixed cost added to
 * every screen, every saved set and every navigation, to re-read fields that
 * almost no route touches.
 *
 * The token is signed and carries the account id, so identity needs no lookup.
 * Routes that genuinely need the stored profile — `/auth/me`, the settings
 * write, the data export — call `req.loadUser()`, which fetches once and
 * remembers. Everything else gets `req.user.id` and one less round trip.
 *
 * What this gives up is noticing that an account has been deleted mid-session.
 * Accounts cannot be deleted in this build, and when they can, the token needs
 * revoking rather than re-reading: a row lookup per request was never the
 * mechanism that would have made that safe.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  let sub;
  try {
    ({ sub } = jwt.verify(token, SECRET));
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }

  req.user = { id: sub };
  let pending = null;
  req.loadUser = () => {
    if (!pending) {
      pending = findUserById(sub).then((user) => {
        if (user) req.user = user;
        return user;
      });
    }
    return pending;
  };
  return next();
}
