const { getSql, initDb, withErrorHandling } = require('../_db');

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDb();
  const sql = getSql();

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

  res.json({ username: rows[0].username, expiresAt: rows[0].expires_at });
});
