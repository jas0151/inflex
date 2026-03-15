const { getSql, initDb, withErrorHandling } = require('../_db');

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, ids } = req.body;
  if (!action || !ids || !ids.length) {
    return res.status(400).json({ error: 'action and ids are required' });
  }

  if (action === 'delete') {
    await sql`DELETE FROM articles WHERE id = ANY(${ids})`;
  } else if (action === 'publish') {
    await sql`UPDATE articles SET published = TRUE, updated_at = NOW() WHERE id = ANY(${ids})`;
  } else if (action === 'unpublish') {
    await sql`UPDATE articles SET published = FALSE, updated_at = NOW() WHERE id = ANY(${ids})`;
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }

  return res.json({ message: `Bulk ${action} completed`, count: ids.length });
});
