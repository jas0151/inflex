const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');
const {
  requireAuth, asyncHandler, extractToken, validateSession,
  generateToken, toSqliteDate, nowSqlite,
} = require('../middleware/auth');

const router = express.Router();

const SALT_ROUNDS = 12;
const SESSION_DURATION_HOURS = 24;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// ── Helpers ──

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(str) {
  return EMAIL_REGEX.test(str);
}

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function checkRateLimit(ip) {
  const db = getDb();
  const cutoff = toSqliteDate(new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000));
  const row = db.prepare(
    'SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND attempted_at > ?'
  ).get(ip, cutoff);
  return row.count >= MAX_LOGIN_ATTEMPTS;
}

function recordAttempt(ip) {
  const db = getDb();
  const now = nowSqlite();
  db.prepare('INSERT INTO login_attempts (ip_address, attempted_at) VALUES (?, ?)').run(ip, now);
  const oldCutoff = toSqliteDate(new Date(Date.now() - 60 * 60 * 1000));
  db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').run(oldCutoff);
}

function clearAttempts(ip) {
  const db = getDb();
  db.prepare('DELETE FROM login_attempts WHERE ip_address = ?').run(ip);
}

function createSession(userId) {
  const db = getDb();
  const token = generateToken();
  const expiresAt = toSqliteDate(new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000));
  const now = nowSqlite();
  db.prepare('INSERT INTO admin_sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(token, userId, expiresAt, now);
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(now);
  return { token, expiresAt };
}

// ── Routes ──

// GET /api/auth/check-setup — check if any admin exists
router.get('/check-setup', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
  res.json({ adminExists: row.count > 0 });
});

// POST /api/auth/setup — create initial admin (only when no admin exists)
router.post('/setup', asyncHandler(async (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
  if (row.count > 0) {
    return res.status(403).json({ error: 'Admin account already exists. Ask an existing admin to add you.' });
  }

  const { username, password, displayName } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!isValidEmail(username)) {
    return res.status(400).json({ error: 'Please enter a valid email address (e.g. you@gmail.com)' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const name = (displayName || username.split('@')[0]).trim();
  db.prepare('INSERT INTO admin_users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)').run(
    username.toLowerCase(), hash, name, 'owner'
  );

  res.status(201).json({ message: 'Admin account created successfully' });
}));

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const ip = getClientIp(req);

  if (checkRateLimit(ip)) {
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
    });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.toLowerCase());

  if (!user) {
    recordAttempt(ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    recordAttempt(ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  clearAttempts(ip);
  const { token, expiresAt } = createSession(user.id);

  res.json({
    token,
    username: user.username,
    displayName: user.display_name || user.username.split('@')[0],
    role: user.role || 'admin',
    expiresAt
  });
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = extractToken(req);
  if (token) {
    const db = getDb();
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
  }
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me — check current session
router.get('/me', (req, res) => {
  const token = extractToken(req);
  const session = validateSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const db = getDb();
  const user = db.prepare('SELECT display_name, role FROM admin_users WHERE id = ?').get(session.user_id);
  res.json({
    username: session.username,
    displayName: user?.display_name || session.username.split('@')[0],
    role: user?.role || 'admin',
    userId: session.user_id,
    expiresAt: session.expires_at
  });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.adminUser.id);

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, user.id);
  db.prepare('DELETE FROM admin_sessions WHERE user_id = ? AND token != ?').run(user.id, req.sessionToken);

  res.json({ message: 'Password changed successfully' });
}));

// POST /api/auth/change-email — update own email (username)
router.post('/change-email', requireAuth, asyncHandler(async (req, res) => {
  const { newEmail, password } = req.body;
  if (!newEmail || !password) {
    return res.status(400).json({ error: 'New email and password are required' });
  }
  if (!isValidEmail(newEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.adminUser.id);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Password is incorrect' });
  }

  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ? AND id != ?').get(newEmail.toLowerCase(), user.id);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use by another admin' });
  }

  db.prepare('UPDATE admin_users SET username = ? WHERE id = ?').run(newEmail.toLowerCase(), user.id);
  res.json({ message: 'Email updated successfully', username: newEmail.toLowerCase() });
}));

// POST /api/auth/change-display-name — update own display name
router.post('/change-display-name', requireAuth, (req, res) => {
  const { displayName } = req.body;
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: 'Display name is required' });
  }
  const db = getDb();
  db.prepare('UPDATE admin_users SET display_name = ? WHERE id = ?').run(displayName.trim(), req.adminUser.id);
  res.json({ message: 'Display name updated', displayName: displayName.trim() });
});

// ── Admin Management (multi-admin) ──

// POST /api/auth/admins — create a new admin account (requires existing admin)
router.post('/admins', requireAuth, asyncHandler(async (req, res) => {
  const { email, password, displayName, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An admin with this email already exists' });
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const name = (displayName || email.split('@')[0]).trim();
  const adminRole = (role === 'owner') ? 'admin' : (role || 'admin'); // only setup can create owners

  db.prepare('INSERT INTO admin_users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)').run(
    email.toLowerCase(), hash, name, adminRole
  );

  const newAdmin = db.prepare('SELECT id, username, display_name, role, created_at FROM admin_users WHERE username = ?').get(email.toLowerCase());
  res.status(201).json({ message: 'Admin account created', admin: newAdmin });
}));

// GET /api/auth/admins — list all admin accounts
router.get('/admins', requireAuth, (req, res) => {
  const db = getDb();
  const admins = db.prepare('SELECT id, username, display_name, role, created_at FROM admin_users ORDER BY created_at ASC').all();
  res.json({ admins });
});

// DELETE /api/auth/admins/:id — remove an admin account
router.delete('/admins/:id', requireAuth, (req, res) => {
  const targetId = parseInt(req.params.id);
  if (targetId === req.adminUser.id) {
    return res.status(400).json({ error: 'Cannot delete your own account' });
  }

  const db = getDb();
  const target = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(targetId);
  if (!target) {
    return res.status(404).json({ error: 'Admin not found' });
  }

  // Delete sessions first, then the user
  db.prepare('DELETE FROM admin_sessions WHERE user_id = ?').run(targetId);
  db.prepare('DELETE FROM admin_users WHERE id = ?').run(targetId);
  res.json({ message: `Admin ${target.username} removed` });
});

// POST /api/auth/admins/:id/reset-password — reset another admin's password
router.post('/admins/:id/reset-password', requireAuth, asyncHandler(async (req, res) => {
  const targetId = parseInt(req.params.id);
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const db = getDb();
  const target = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(targetId);
  if (!target) {
    return res.status(404).json({ error: 'Admin not found' });
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, targetId);
  db.prepare('DELETE FROM admin_sessions WHERE user_id = ?').run(targetId);

  res.json({ message: `Password reset for ${target.username}` });
}));

// ── Sessions ──

// GET /api/auth/sessions — list active sessions for current user
router.get('/sessions', requireAuth, (req, res) => {
  const db = getDb();
  const now = nowSqlite();
  const sessions = db.prepare(`
    SELECT id, created_at, expires_at,
           CASE WHEN token = ? THEN 1 ELSE 0 END as is_current
    FROM admin_sessions
    WHERE user_id = ? AND expires_at > ?
    ORDER BY created_at DESC
  `).all(req.sessionToken, req.adminUser.id, now);
  res.json({ sessions });
});

// DELETE /api/auth/sessions/:id — revoke a specific session
router.delete('/sessions/:id', requireAuth, (req, res) => {
  const db = getDb();
  const session = db.prepare('SELECT * FROM admin_sessions WHERE id = ? AND user_id = ?').get(req.params.id, req.adminUser.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (session.token === req.sessionToken) {
    return res.status(400).json({ error: 'Cannot revoke current session. Use logout instead.' });
  }
  db.prepare('DELETE FROM admin_sessions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Session revoked' });
});

// POST /api/auth/sessions/revoke-all — revoke all sessions except current
router.post('/sessions/revoke-all', requireAuth, (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM admin_sessions WHERE user_id = ? AND token != ?').run(req.adminUser.id, req.sessionToken);
  res.json({ message: `Revoked ${result.changes} session(s)` });
});

module.exports = router;
