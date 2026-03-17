const { getSql, initDb, slugify, estimateReadTime, withErrorHandling } = require('../_db');
const { requireAuth } = require('../_auth');

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();

  if (req.method === 'GET') {
    const search = req.query.search;
    let rows;
    if (search) {
      const q = `%${search}%`;
      rows = await sql`
        SELECT id, title, slug, tag, excerpt, cover_image, author, read_time, is_featured, views, created_at
        FROM articles
        WHERE published = TRUE AND (scheduled_at IS NULL OR scheduled_at <= NOW())
          AND (title ILIKE ${q} OR tag ILIKE ${q} OR excerpt ILIKE ${q})
        ORDER BY created_at DESC
      `;
    } else {
      rows = await sql`
        SELECT id, title, slug, tag, excerpt, cover_image, author, read_time, is_featured, views, created_at
        FROM articles
        WHERE published = TRUE AND (scheduled_at IS NULL OR scheduled_at <= NOW())
        ORDER BY created_at DESC
      `;
    }
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { title, tag, excerpt, content, author, is_featured, cover_image } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    let slug = slugify(title);
    const existing = await sql`SELECT id FROM articles WHERE slug = ${slug}`;
    if (existing.length) {
      slug = slug + '-' + Date.now();
    }

    const read_time = estimateReadTime(content);
    const featured = is_featured === true || is_featured === 'true';

    const rows = await sql`
      INSERT INTO articles (title, slug, tag, excerpt, content, cover_image, author, read_time, is_featured)
      VALUES (${title}, ${slug}, ${tag || ''}, ${excerpt || ''}, ${content}, ${cover_image || ''}, ${author || 'Inflex Research'}, ${read_time}, ${featured})
      RETURNING *
    `;
    return res.status(201).json(rows[0]);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
});
