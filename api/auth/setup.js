const bcrypt = require('bcryptjs');
const { getSql, initDb, withErrorHandling } = require('../_db');

const SALT_ROUNDS = 12;

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDb();
  const sql = getSql();

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

  res.status(201).json({ message: 'Admin account created successfully' });
});
