const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db } = require('../db');
const { uuid, ApiError, logActivity } = require('../utils/helpers');
const { signToken, authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

function sanitizeUser(u) {
  if (!u) return u;
  const { password_hash, reset_token, reset_token_expires_at, ...rest } = u;
  return rest;
}

// POST /api/auth/signup — creates an EMPLOYEE account only. No role selection.
router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password, departmentId } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'name, email and password are required');
  if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  if (departmentId) {
    const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(departmentId);
    if (!dept) throw new ApiError(400, 'Invalid department');
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 10);
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, department_id, status)
     VALUES (?, ?, ?, ?, 'EMPLOYEE', ?, 'ACTIVE')`
  ).run(id, name, email.toLowerCase(), passwordHash, departmentId || null);

  logActivity({ actorId: id, action: 'SIGNUP', entityType: 'user', entityId: id });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(user);
  res.status(201).json({ token, user: sanitizeUser(user) });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) throw new ApiError(401, 'Invalid email or password');
  if (user.status !== 'ACTIVE') throw new ApiError(403, 'This account has been deactivated');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new ApiError(401, 'Invalid email or password');

  const token = signToken(user);
  logActivity({ actorId: user.id, action: 'LOGIN', entityType: 'user', entityId: user.id });
  res.json({ token, user: sanitizeUser(user) });
}));

// GET /api/auth/me — session validation
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

// POST /api/auth/forgot-password — issues a reset token (in a real deployment this would be emailed)
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'email is required');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  // Always return 200 to avoid leaking which emails are registered.
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?')
    .run(token, expires, user.id);

  // Dev convenience: return the token directly instead of sending an email.
  res.json({ message: 'If that email exists, a reset link has been sent.', devResetToken: token });
}));

// POST /api/auth/reset-password
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) throw new ApiError(400, 'token and newPassword are required');
  if (newPassword.length < 8) throw new ApiError(400, 'Password must be at least 8 characters');

  const user = db.prepare(
    `SELECT * FROM users WHERE reset_token = ? AND reset_token_expires_at > datetime('now')`
  ).get(token);
  if (!user) throw new ApiError(400, 'Reset token is invalid or expired');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  db.prepare(
    `UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL, updated_at = datetime('now')
     WHERE id = ?`
  ).run(passwordHash, user.id);

  logActivity({ actorId: user.id, action: 'PASSWORD_RESET', entityType: 'user', entityId: user.id });
  res.json({ message: 'Password updated successfully' });
}));

module.exports = router;
