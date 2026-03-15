const { neon } = require('@neondatabase/serverless');

let sqlClient;
let initialized = false;

function getSql() {
  if (!sqlClient) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set. Add a Neon Postgres database in your Vercel project settings under Storage.');
    }
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

async function initDb() {
  if (initialized) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      tag TEXT DEFAULT '',
      excerpt TEXT DEFAULT '',
      content TEXT DEFAULT '',
      cover_image TEXT DEFAULT '',
      author TEXT DEFAULT 'Inflex Research',
      read_time TEXT DEFAULT '',
      is_featured BOOLEAN DEFAULT FALSE,
      published BOOLEAN DEFAULT TRUE,
      views INTEGER DEFAULT 0,
      scheduled_at TIMESTAMP DEFAULT NULL,
      meta_description TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
  // Migration: add new columns safely
  try { await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0`; } catch(e) {}
  try { await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP DEFAULT NULL`; } catch(e) {}
  try { await sql`ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT ''`; } catch(e) {}
  initialized = true;
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function estimateReadTime(content) {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

// Wrap handler with try/catch so errors always return JSON
function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error('API error:', err);
      const message = err.message || 'Internal server error';
      return res.status(500).json({ error: message });
    }
  };
}

module.exports = { getSql, initDb, slugify, estimateReadTime, withErrorHandling };
