const { getSql, initDb } = require('../_db');

module.exports = async function handler(req, res) {
  await initDb();
  const sql = getSql();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rows = await sql`SELECT * FROM articles ORDER BY created_at DESC`;
  return res.json(rows);
};
