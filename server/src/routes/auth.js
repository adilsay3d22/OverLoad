import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { sql } from '../lib/sql.js';
import { createUser, findUserByEmail, updateUser } from '../lib/repo.js';
import { uid } from '../lib/catalog.js';
import { signToken, publicUser, requireAuth } from '../lib/auth.js';

const router = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Rest starts full screen by default. Accounts created before the mini pill
 * existed stored 'banner', which is the same idea under an older name.
 */
const REST_PRESENTATIONS = new Set(['fullscreen', 'mini']);
const restPresentationOf = (user) =>
  user.restPresentation === 'banner' ? 'mini' : user.restPresentation ?? 'fullscreen';

router.post('/signup', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  const errors = {};
  if (name.length < 2) errors.name = 'Tell us what to call you.';
  if (!EMAIL.test(email)) errors.email = 'That does not look like an email address.';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  if (await findUserByEmail(email)) errors.email = 'That email already has an account.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Check the form', errors });

  const user = {
    id: uid('u'),
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    units: 'kg',
    restDefaultSeconds: 180,
    restPresentation: 'fullscreen',
    createdAt: new Date().toISOString(),
  };
  await createUser(user);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const user = await findUserByEmail(email);
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Email or password is wrong.' });
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: {
      ...publicUser(req.user),
      restDefaultSeconds: req.user.restDefaultSeconds ?? 180,
      restPresentation: restPresentationOf(req.user),
    },
  });
});

router.patch('/me', requireAuth, async (req, res) => {
  const { name, units, restDefaultSeconds, restPresentation } = req.body || {};
  const patch = {};
  if (typeof name === 'string' && name.trim().length >= 2) patch.name = name.trim();
  if (units === 'kg' || units === 'lb') patch.units = units;
  if (Number.isFinite(restDefaultSeconds)) {
    patch.restDefaultSeconds = Math.min(600, Math.max(30, Math.round(restDefaultSeconds)));
  }
  if (REST_PRESENTATIONS.has(restPresentation)) patch.restPresentation = restPresentation;
  req.user = await updateUser(req.user.id, patch);
  res.json({
    user: {
      ...publicUser(req.user),
      restDefaultSeconds: req.user.restDefaultSeconds ?? 180,
      restPresentation: restPresentationOf(req.user),
    },
  });
});

/**
 * Wipe every program and logged set for this account, keeping the login and
 * its preferences. Irreversible — the client gates it behind a two-step
 * confirmation, and Export data is the way out beforehand.
 */
router.delete('/me/data', requireAuth, async (req, res) => {
  // `log_sets` and the plan tables go with their parents on cascade, so these
  // two statements really are the whole wipe.
  const programs = await sql`delete from programs where user_id = ${req.user.id} returning id`;
  const logs = await sql`delete from logs where user_id = ${req.user.id} returning id`;
  res.json({ removedPrograms: programs.length, removedLogs: logs.length });
});

export default router;
