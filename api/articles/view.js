const { getSql, initDb, withErrorHandling } = require('../_db');

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { slug } = req.body;
  if (!slug) return res.status(400).json({ error: 'slug is required' });

  const result = await sql`UPDATE articles SET views = views + 1 WHERE slug = ${slug} RETURNING views`;
  if (!result.length) return res.status(404).json({ error: 'Article not found' });

  return res.json({ message: 'View recorded', views: result[0].views });
});
