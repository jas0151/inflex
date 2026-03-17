const { getSql, initDb } = require('./_db');

// Verify admin session from Authorization header
async function verifySession(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;

  await initDb();
  const sql = getSql();

  const rows = await sql`
    SELECT s.user_id, u.username FROM admin_sessions s
    JOIN admin_users u ON s.user_id = u.id
    WHERE s.token = ${token} AND s.expires_at > NOW()
  `;

  return rows.length > 0 ? rows[0] : null;
}

// Middleware-style check that returns 401 if not authenticated
async function requireAuth(req, res) {
  const user = await verifySession(req);
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return null;
  }
  return user;
}

// Get client IP for rate limiting
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

module.exports = { verifySession, requireAuth, getClientIp };
