const { getSql, initDb, withErrorHandling } = require('../_db');

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDb();
  const sql = getSql();

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
  }

  res.json({ message: 'Logged out' });
});
