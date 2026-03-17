const crypto = require('crypto');
const { getDb } = require('../db');

// Convert JS Date to SQLite-compatible format: "YYYY-MM-DD HH:MM:SS"
function toSqliteDate(date) {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function nowSqlite() {
  return toSqliteDate(new Date());
}

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

// Validate session and return user info, or null
function validateSession(token) {
  if (!token) return null;
  const db = getDb();
  const now = nowSqlite();
  const session = db.prepare(`
    SELECT s.id as session_id, s.token, s.expires_at, s.user_id,
           u.username, u.id as uid
    FROM admin_sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, now);
  return session || null;
}

// Extract bearer token from request
function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

// Express middleware: require admin authentication
function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  const session = validateSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  req.adminUser = { id: session.user_id, username: session.username };
  req.sessionToken = token;
  next();
}

// Wrap async route handlers for Express 4 (catches rejected promises)
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  requireAuth,
  asyncHandler,
  validateSession,
  extractToken,
  generateToken,
  toSqliteDate,
  nowSqlite,
};
