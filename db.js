const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'inflex.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    db.exec(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        tag TEXT DEFAULT '',
        excerpt TEXT DEFAULT '',
        content TEXT DEFAULT '',
        cover_image TEXT DEFAULT '',
        author TEXT DEFAULT 'Inflex Research',
        read_time TEXT DEFAULT '',
        is_featured INTEGER DEFAULT 0,
        published INTEGER DEFAULT 1,
        views INTEGER DEFAULT 0,
        scheduled_at TEXT DEFAULT NULL,
        meta_description TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Migration: add new columns if they don't exist (safe for existing databases)
    const cols = db.prepare("PRAGMA table_info(articles)").all().map(c => c.name);
    if (!cols.includes('views')) {
      db.exec("ALTER TABLE articles ADD COLUMN views INTEGER DEFAULT 0");
    }
    if (!cols.includes('scheduled_at')) {
      db.exec("ALTER TABLE articles ADD COLUMN scheduled_at TEXT DEFAULT NULL");
    }
    if (!cols.includes('meta_description')) {
      db.exec("ALTER TABLE articles ADD COLUMN meta_description TEXT DEFAULT ''");
    }
  }
  return db;
}

module.exports = { getDb };
