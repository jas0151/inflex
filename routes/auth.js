const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getDb } = require('../db');

const router = express.Router();

const SALT_ROUNDS = 12;
const SESSION_DURATION_HOURS = 24;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// Helper: get client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
}

// Helper: check rate limit
function checkRateLimit(ip) {
  const db = getDb();
  const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
  const attempts = db.prepare(
    "SELECT COUNT(*) as count FROM login_attempts WHERE ip_address = ? AND attempted_at > ?"
  ).get(ip, cutoff);
  return attempts.count >= MAX_LOGIN_ATTEMPTS;
}

// Helper: record login attempt
function recordAttempt(ip) {
  const db = getDb();
  db.prepare("INSERT INTO login_attempts (ip_address) VALUES (?)").run(ip);
  // Clean up old attempts (older than 1 hour)
  const oldCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  db.prepare("DELETE FROM login_attempts WHERE attempted_at < ?").run(oldCutoff);
}

// Helper: generate secure token
function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

// POST /api/auth/setup — create initial admin (only works if no admin exists)
router.post('/setup', async (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
  if (existing.count > 0) {
    return res.status(403).json({ error: 'Admin account already exists' });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);

  res.status(201).json({ message: 'Admin account created successfully' });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const ip = getClientIp(req);

  if (checkRateLimit(ip)) {
    return res.status(429).json({
      error: `Too many login attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
    });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);

  if (!user) {
    recordAttempt(ip);
    // Use generic message to prevent username enumeration
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    recordAttempt(ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create session
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO admin_sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt);

  // Clean up expired sessions
  db.prepare("DELETE FROM admin_sessions WHERE expires_at < datetime('now')").run();

  res.json({
    token,
    username: user.username,
    expiresAt
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const db = getDb();
    db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
  }
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me — check current session
router.get('/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, u.username FROM admin_sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  res.json({ username: session.username, expiresAt: session.expires_at });
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const session = db.prepare(`
    SELECT s.*, u.username FROM admin_sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token);

  if (!session) {
    return res.status(401).json({ error: 'Session expired' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(session.user_id);
  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  db.prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?').run(hash, user.id);

  // Invalidate all other sessions
  db.prepare('DELETE FROM admin_sessions WHERE user_id = ? AND token != ?').run(user.id, token);

  res.json({ message: 'Password changed successfully' });
});

// GET /api/auth/check-setup — check if admin exists
router.get('/check-setup', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
  res.json({ adminExists: existing.count > 0 });
});

module.exports = router;
