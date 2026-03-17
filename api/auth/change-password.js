const bcrypt = require('bcryptjs');
const { getSql, initDb, withErrorHandling } = require('../_db');
const { requireAuth } = require('../_auth');

const SALT_ROUNDS = 12;

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDb();
  const sql = getSql();

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

  // Invalidate other sessions
  const token = req.headers.authorization?.replace('Bearer ', '');
  await sql`DELETE FROM admin_sessions WHERE user_id = ${user.user_id} AND token != ${token}`;

  res.json({ message: 'Password changed successfully' });
});
