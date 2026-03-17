const { getSql, initDb, withErrorHandling } = require('../_db');

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDb();
  const sql = getSql();

  const existing = await sql`SELECT COUNT(*) as count FROM admin_users`;
  res.json({ adminExists: existing[0].count > 0 });
});
