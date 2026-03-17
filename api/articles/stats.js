const { getSql, initDb, withErrorHandling } = require('../_db');
const { requireAuth } = require('../_auth');

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const [totals] = await sql`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE published = TRUE) as published, COUNT(*) FILTER (WHERE published = FALSE) as drafts, COUNT(*) FILTER (WHERE is_featured = TRUE) as featured, COALESCE(SUM(views), 0) as total_views, COUNT(*) FILTER (WHERE scheduled_at IS NOT NULL AND scheduled_at > NOW()) as scheduled, COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week FROM articles`;
  const recentArticles = await sql`SELECT id, title, slug, published, views, created_at FROM articles ORDER BY created_at DESC LIMIT 5`;

  return res.json({
    total: Number(totals.total),
    published: Number(totals.published),
    drafts: Number(totals.drafts),
    featured: Number(totals.featured),
    totalViews: Number(totals.total_views),
    scheduled: Number(totals.scheduled),
    thisWeek: Number(totals.this_week),
    recentArticles
  });
});
