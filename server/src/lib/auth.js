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

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  let sub;
  try {
    ({ sub } = jwt.verify(token, SECRET));
  } catch {
    return res.status(401).json({ error: 'Session expired' });
  }
  try {
    const user = await findUserById(sub);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}
