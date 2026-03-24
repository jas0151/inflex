const { getSql, initDb, estimateReadTime, withErrorHandling } = require('../_db');
const { requireAuth } = require('../_auth');

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();
  const { slug } = req.query;

  if (req.method === 'GET') {
    const rows = await sql`SELECT * FROM articles WHERE slug = ${slug}`;
    if (!rows.length) return res.status(404).json({ error: 'Article not found' });
    const article = rows[0];

    // Get related articles (same tag, excluding current)
    let related = [];
    if (article.tag) {
      related = await sql`
        SELECT id, title, slug, tag, excerpt, cover_image, author, read_time, created_at
        FROM articles WHERE tag = ${article.tag} AND id != ${article.id} AND published = TRUE
        ORDER BY created_at DESC LIMIT 3
      `;
    }
    if (related.length < 3) {
      const excludeIds = [article.id, ...related.map(r => r.id)];
      const more = await sql`
        SELECT id, title, slug, tag, excerpt, cover_image, author, read_time, created_at
        FROM articles WHERE id != ALL(${excludeIds}) AND published = TRUE
        ORDER BY created_at DESC LIMIT ${3 - related.length}
      `;
      related = [...related, ...more];
    }

    return res.json({ ...article, related });
  }

  if (req.method === 'PUT') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const id = parseInt(slug);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid article ID' });

    const existing = await sql`SELECT * FROM articles WHERE id = ${id}`;
    if (!existing.length) return res.status(404).json({ error: 'Article not found' });
    const article = existing[0];

    const { title, tag, excerpt, content, author, is_featured, published, cover_image, scheduled_at, meta_description } = req.body;
    const read_time = content ? estimateReadTime(content) : article.read_time;
    const featured = is_featured === true || is_featured === 'true' ? true : (is_featured === false || is_featured === 'false' ? false : article.is_featured);
    const pub = published === false || published === 'false' ? false : true;

    const rows = await sql`
      UPDATE articles
      SET title = ${title || article.title},
          tag = ${tag !== undefined ? tag : article.tag},
          excerpt = ${excerpt !== undefined ? excerpt : article.excerpt},
          content = ${content || article.content},
          cover_image = ${cover_image !== undefined ? cover_image : article.cover_image},
          author = ${author || article.author},
          read_time = ${read_time},
          is_featured = ${featured},
          published = ${pub},
          scheduled_at = ${scheduled_at !== undefined ? (scheduled_at || null) : article.scheduled_at},
          meta_description = ${meta_description !== undefined ? meta_description : (article.meta_description || '')},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;
    return res.json(rows[0]);
  }

  if (req.method === 'DELETE') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const id = parseInt(slug);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid article ID' });

    const rows = await sql`SELECT id FROM articles WHERE id = ${id}`;
    if (!rows.length) return res.status(404).json({ error: 'Article not found' });

    await sql`DELETE FROM articles WHERE id = ${id}`;
    return res.json({ message: 'Article deleted' });
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
});
