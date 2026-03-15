const express = require('express');
const multer = require('multer');
const path = require('path');
const { getDb } = require('../db');

const router = express.Router();

// File upload config
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  }
});

// Helper: generate slug from title
function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Helper: estimate read time
function estimateReadTime(content) {
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

// GET /api/articles — list all published articles (with search + scheduling filter)
router.get('/', (req, res) => {
  const db = getDb();
  const search = req.query.search;
  let articles;
  if (search) {
    const q = `%${search}%`;
    articles = db.prepare(`
      SELECT id, title, slug, tag, excerpt, cover_image, author, read_time, is_featured, created_at
      FROM articles
      WHERE published = 1 AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
        AND (title LIKE ? OR tag LIKE ? OR excerpt LIKE ?)
      ORDER BY created_at DESC
    `).all(q, q, q);
  } else {
    articles = db.prepare(`
      SELECT id, title, slug, tag, excerpt, cover_image, author, read_time, is_featured, created_at
      FROM articles
      WHERE published = 1 AND (scheduled_at IS NULL OR scheduled_at <= datetime('now'))
      ORDER BY created_at DESC
    `).all();
  }
  res.json(articles);
});

// GET /api/articles/stats — admin dashboard stats
router.get('/stats', (req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM articles').get().count;
  const published = db.prepare('SELECT COUNT(*) as count FROM articles WHERE published = 1').get().count;
  const drafts = db.prepare('SELECT COUNT(*) as count FROM articles WHERE published = 0').get().count;
  const featured = db.prepare('SELECT COUNT(*) as count FROM articles WHERE is_featured = 1').get().count;
  const totalViews = db.prepare('SELECT COALESCE(SUM(views), 0) as count FROM articles').get().count;
  const scheduled = db.prepare("SELECT COUNT(*) as count FROM articles WHERE scheduled_at IS NOT NULL AND scheduled_at > datetime('now')").get().count;
  const thisWeek = db.prepare("SELECT COUNT(*) as count FROM articles WHERE created_at >= datetime('now', '-7 days')").get().count;
  const recentArticles = db.prepare('SELECT id, title, slug, published, views, created_at FROM articles ORDER BY created_at DESC LIMIT 5').all();
  res.json({ total, published, drafts, featured, totalViews, scheduled, thisWeek, recentArticles });
});

// GET /api/articles/all — list all articles (admin)
router.get('/all', (req, res) => {
  const db = getDb();
  const articles = db.prepare(`
    SELECT * FROM articles ORDER BY created_at DESC
  `).all();
  res.json(articles);
});

// POST /api/articles/bulk — bulk operations
router.post('/bulk', express.json(), (req, res) => {
  const db = getDb();
  const { action, ids } = req.body;
  if (!action || !ids || !ids.length) {
    return res.status(400).json({ error: 'action and ids are required' });
  }
  const placeholders = ids.map(() => '?').join(',');
  if (action === 'delete') {
    db.prepare(`DELETE FROM articles WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'publish') {
    db.prepare(`UPDATE articles SET published = 1, updated_at = datetime('now') WHERE id IN (${placeholders})`).run(...ids);
  } else if (action === 'unpublish') {
    db.prepare(`UPDATE articles SET published = 0, updated_at = datetime('now') WHERE id IN (${placeholders})`).run(...ids);
  } else {
    return res.status(400).json({ error: 'Invalid action' });
  }
  res.json({ message: `Bulk ${action} completed`, count: ids.length });
});

// POST /api/articles/:id/duplicate — duplicate article
router.post('/:id/duplicate', (req, res) => {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const newTitle = `Copy of ${article.title}`;
  let slug = slugify(newTitle);
  const existing = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
  if (existing) slug = slug + '-' + Date.now();

  const result = db.prepare(`
    INSERT INTO articles (title, slug, tag, excerpt, content, cover_image, author, read_time, is_featured, published, meta_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `).run(newTitle, slug, article.tag, article.excerpt, article.content, article.cover_image, article.author, article.read_time, article.meta_description || '');

  const newArticle = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newArticle);
});

// POST /api/articles/:slug/view — increment view counter
router.post('/:slug/view', (req, res) => {
  const db = getDb();
  const result = db.prepare('UPDATE articles SET views = views + 1 WHERE slug = ?').run(req.params.slug);
  if (result.changes === 0) return res.status(404).json({ error: 'Article not found' });
  res.json({ message: 'View recorded' });
});

// GET /api/articles/:slug — get single article by slug (includes related)
router.get('/:slug', (req, res) => {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  // Get related articles (same tag, excluding current)
  let related = [];
  if (article.tag) {
    related = db.prepare(`
      SELECT id, title, slug, tag, excerpt, cover_image, author, read_time, created_at
      FROM articles
      WHERE tag = ? AND id != ? AND published = 1
      ORDER BY created_at DESC LIMIT 3
    `).all(article.tag, article.id);
  }
  // Fallback: recent articles if no tag matches
  if (related.length < 3) {
    const excludeIds = [article.id, ...related.map(r => r.id)];
    const placeholders = excludeIds.map(() => '?').join(',');
    const more = db.prepare(`
      SELECT id, title, slug, tag, excerpt, cover_image, author, read_time, created_at
      FROM articles
      WHERE id NOT IN (${placeholders}) AND published = 1
      ORDER BY created_at DESC LIMIT ${3 - related.length}
    `).all(...excludeIds);
    related = [...related, ...more];
  }

  res.json({ ...article, related });
});

// POST /api/articles — create article
router.post('/', upload.single('cover_image'), (req, res) => {
  const db = getDb();
  const { title, tag, excerpt, content, author, is_featured, scheduled_at, meta_description } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  let slug = slugify(title);
  const existing = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
  if (existing) {
    slug = slug + '-' + Date.now();
  }

  const cover_image = req.file ? `/uploads/${req.file.filename}` : '';
  const read_time = estimateReadTime(content);

  const result = db.prepare(`
    INSERT INTO articles (title, slug, tag, excerpt, content, cover_image, author, read_time, is_featured, scheduled_at, meta_description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    slug,
    tag || '',
    excerpt || '',
    content,
    cover_image,
    author || 'Inflex Research',
    read_time,
    is_featured === 'true' || is_featured === '1' ? 1 : 0,
    scheduled_at || null,
    meta_description || ''
  );

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(article);
});

// PUT /api/articles/:id — update article
router.put('/:id', upload.single('cover_image'), (req, res) => {
  const db = getDb();
  const { title, tag, excerpt, content, author, is_featured, published, scheduled_at, meta_description } = req.body;
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const cover_image = req.file ? `/uploads/${req.file.filename}` : article.cover_image;
  const read_time = content ? estimateReadTime(content) : article.read_time;

  db.prepare(`
    UPDATE articles
    SET title = ?, tag = ?, excerpt = ?, content = ?, cover_image = ?, author = ?,
        read_time = ?, is_featured = ?, published = ?, scheduled_at = ?, meta_description = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    title || article.title,
    tag !== undefined ? tag : article.tag,
    excerpt !== undefined ? excerpt : article.excerpt,
    content || article.content,
    cover_image,
    author || article.author,
    read_time,
    is_featured === 'true' || is_featured === '1' ? 1 : (is_featured === 'false' || is_featured === '0' ? 0 : article.is_featured),
    published === 'false' || published === '0' ? 0 : 1,
    scheduled_at !== undefined ? (scheduled_at || null) : article.scheduled_at,
    meta_description !== undefined ? meta_description : (article.meta_description || ''),
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/articles/:id — delete article
router.delete('/:id', (req, res) => {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.json({ message: 'Article deleted' });
});

// POST /api/articles/upload-image — upload image for article content
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

module.exports = router;
