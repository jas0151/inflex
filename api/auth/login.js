const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getSql, initDb, withErrorHandling } = require('../_db');
const { getClientIp } = require('../_auth');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const SESSION_DURATION_HOURS = 24;

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDb();
  const sql = getSql();
  const ip = getClientIp(req);

  // Check rate limit
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

  // Create session
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000).toISOString();

  await sql`INSERT INTO admin_sessions (token, user_id, expires_at) VALUES (${token}, ${user.id}, ${expiresAt}::timestamp)`;

  // Clean up expired sessions
  await sql`DELETE FROM admin_sessions WHERE expires_at < NOW()`;

  // Clean up old login attempts
  const oldCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  await sql`DELETE FROM login_attempts WHERE attempted_at < ${oldCutoff}::timestamp`;

  res.json({ token, username: user.username, expiresAt });
});
