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

// GET /api/articles — list all published articles
router.get('/', (req, res) => {
  const db = getDb();
  const articles = db.prepare(`
    SELECT id, title, slug, tag, excerpt, cover_image, author, read_time, is_featured, created_at
    FROM articles
    WHERE published = 1
    ORDER BY created_at DESC
  `).all();
  res.json(articles);
});

// GET /api/articles/all — list all articles (admin)
router.get('/all', (req, res) => {
  const db = getDb();
  const articles = db.prepare(`
    SELECT * FROM articles ORDER BY created_at DESC
  `).all();
  res.json(articles);
});

// GET /api/articles/:slug — get single article by slug
router.get('/:slug', (req, res) => {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE slug = ?').get(req.params.slug);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
});

// POST /api/articles — create article
router.post('/', upload.single('cover_image'), (req, res) => {
  const db = getDb();
  const { title, tag, excerpt, content, author, is_featured } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  let slug = slugify(title);
  // Ensure unique slug
  const existing = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug);
  if (existing) {
    slug = slug + '-' + Date.now();
  }

  const cover_image = req.file ? `/uploads/${req.file.filename}` : '';
  const read_time = estimateReadTime(content);

  const stmt = db.prepare(`
    INSERT INTO articles (title, slug, tag, excerpt, content, cover_image, author, read_time, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    title,
    slug,
    tag || '',
    excerpt || '',
    content,
    cover_image,
    author || 'Inflex Research',
    read_time,
    is_featured === 'true' || is_featured === '1' ? 1 : 0
  );

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(article);
});

// PUT /api/articles/:id — update article
router.put('/:id', upload.single('cover_image'), (req, res) => {
  const db = getDb();
  const { title, tag, excerpt, content, author, is_featured, published } = req.body;
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const cover_image = req.file ? `/uploads/${req.file.filename}` : article.cover_image;
  const read_time = content ? estimateReadTime(content) : article.read_time;

  db.prepare(`
    UPDATE articles
    SET title = ?, tag = ?, excerpt = ?, content = ?, cover_image = ?, author = ?,
        read_time = ?, is_featured = ?, published = ?, updated_at = datetime('now')
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
