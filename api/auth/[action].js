const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getSql, initDb, withErrorHandling } = require('../_db');
const { requireAuth, getClientIp } = require('../_auth');

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_DURATION_HOURS = 24;

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();
  const action = req.query.action;

  // ── POST /api/auth/login ──
  if (action === 'login' && req.method === 'POST') {
    const ip = getClientIp(req);

    const cutoff = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000).toISOString();
    const attempts = await sql`
      SELECT COUNT(*) as count FROM login_attempts
      WHERE ip_address = ${ip} AND attempted_at > ${cutoff}::timestamp
    `;
    if (attempts[0].count >= MAX_LOGIN_ATTEMPTS) {
      return res.status(429).json({
        error: `Too many login attempts. Try again in ${LOCKOUT_MINUTES} minutes.`
      });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = await sql`SELECT * FROM admin_users WHERE username = ${username}`;
    if (!users.length) {
      await sql`INSERT INTO login_attempts (ip_address) VALUES (${ip})`;
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await sql`INSERT INTO login_attempts (ip_address) VALUES (${ip})`;
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString();

    await sql`INSERT INTO admin_sessions (token, user_id, expires_at) VALUES (${token}, ${user.id}, ${expiresAt}::timestamp)`;
    await sql`DELETE FROM admin_sessions WHERE expires_at < NOW()`;

    const oldCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await sql`DELETE FROM login_attempts WHERE attempted_at < ${oldCutoff}::timestamp`;

    return res.json({ token, username: user.username, expiresAt });
  }

  // ── POST /api/auth/logout ──
  if (action === 'logout' && req.method === 'POST') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
    }
    return res.json({ message: 'Logged out' });
  }

  // ── GET /api/auth/me ──
  if (action === 'me' && req.method === 'GET') {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const rows = await sql`
      SELECT s.expires_at, u.username FROM admin_sessions s
      JOIN admin_users u ON s.user_id = u.id
      WHERE s.token = ${token} AND s.expires_at > NOW()
    `;

    if (!rows.length) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    return res.json({ username: rows[0].username, expiresAt: rows[0].expires_at });
  }

  // ── POST /api/auth/setup ──
  if (action === 'setup' && req.method === 'POST') {
    const existing = await sql`SELECT COUNT(*) as count FROM admin_users`;
    if (existing[0].count > 0) {
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
    await sql`INSERT INTO admin_users (username, password_hash) VALUES (${username}, ${hash})`;

    return res.status(201).json({ message: 'Admin account created successfully' });
  }

  // ── GET /api/auth/check-setup ──
  if (action === 'check-setup' && req.method === 'GET') {
    const existing = await sql`SELECT COUNT(*) as count FROM admin_users`;
    return res.json({ adminExists: existing[0].count > 0 });
  }

  // ── POST /api/auth/change-password ──
  if (action === 'change-password' && req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const users = await sql`SELECT * FROM admin_users WHERE id = ${user.user_id}`;
    if (!users.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await sql`UPDATE admin_users SET password_hash = ${hash} WHERE id = ${user.user_id}`;

    const token = req.headers.authorization?.replace('Bearer ', '');
    await sql`DELETE FROM admin_sessions WHERE user_id = ${user.user_id} AND token != ${token}`;

    return res.json({ message: 'Password changed successfully' });
  }

  return res.status(404).json({ error: 'Unknown auth action' });
});
