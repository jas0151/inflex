const { getSql, initDb, slugify, withErrorHandling } = require('../_db');
const { requireAuth } = require('../_auth');

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Article id is required' });

  const existing = await sql`SELECT * FROM articles WHERE id = ${id}`;
  if (!existing.length) return res.status(404).json({ error: 'Article not found' });
  const article = existing[0];

  const newTitle = `Copy of ${article.title}`;
  let slug = slugify(newTitle);
  const slugCheck = await sql`SELECT id FROM articles WHERE slug = ${slug}`;
  if (slugCheck.length) slug = slug + '-' + Date.now();

  const rows = await sql`
    INSERT INTO articles (title, slug, tag, excerpt, content, cover_image, author, read_time, is_featured, published, meta_description)
    VALUES (${newTitle}, ${slug}, ${article.tag}, ${article.excerpt}, ${article.content}, ${article.cover_image}, ${article.author}, ${article.read_time}, FALSE, FALSE, ${article.meta_description || ''})
    RETURNING *
  `;

  return res.status(201).json(rows[0]);
});
