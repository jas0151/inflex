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

    // Admin users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT DEFAULT '',
        role TEXT DEFAULT 'admin',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Migration: add new columns to admin_users if they don't exist
    const adminCols = db.prepare("PRAGMA table_info(admin_users)").all().map(c => c.name);
    if (!adminCols.includes('display_name')) {
      db.exec("ALTER TABLE admin_users ADD COLUMN display_name TEXT DEFAULT ''");
    }
    if (!adminCols.includes('role')) {
      db.exec("ALTER TABLE admin_users ADD COLUMN role TEXT DEFAULT 'admin'");
    }

    // Admin sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
      );
    `);

    // Subscribers table
    db.exec(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT DEFAULT '',
        is_active INTEGER DEFAULT 1,
        subscribed_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Login attempts table (rate limiting)
    db.exec(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL,
        attempted_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }
  return db;
}

module.exports = { getDb };
