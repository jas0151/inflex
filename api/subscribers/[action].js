const { getSql, initDb, withErrorHandling } = require('../_db');
const { requireAuth } = require('../_auth');

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();
  const action = req.query.action || 'index';

  // ── POST /api/subscribers — public: subscribe ──
  if (action === 'index' && req.method === 'POST') {
    const { email, name } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const emailLower = email.toLowerCase();
    const existing = await sql`SELECT * FROM subscribers WHERE email = ${emailLower}`;
    if (existing.length) {
      if (existing[0].is_active) {
        return res.json({ message: 'Already subscribed' });
      }
      await sql`UPDATE subscribers SET is_active = TRUE, name = ${name || existing[0].name} WHERE id = ${existing[0].id}`;
      return res.json({ message: 'Subscription reactivated' });
    }

    await sql`INSERT INTO subscribers (email, name) VALUES (${emailLower}, ${name || ''})`;
    return res.status(201).json({ message: 'Subscribed successfully' });
  }

  // ── GET /api/subscribers — admin only: list subscribers ──
  if (action === 'index' && req.method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) return;

    const subscribers = await sql`SELECT id, email, name, is_active, subscribed_at FROM subscribers ORDER BY subscribed_at DESC`;
    const active = subscribers.filter(s => s.is_active).length;
    return res.json({ subscribers, total: subscribers.length, active });
  }

  // ── DELETE /api/subscribers/:email — public: unsubscribe by email ──
  if (req.method === 'DELETE' && action && action.includes('@')) {
    const email = decodeURIComponent(action).toLowerCase();
    const result = await sql`UPDATE subscribers SET is_active = FALSE WHERE email = ${email}`;
    if (!result.length && result.count === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    return res.json({ message: 'Unsubscribed successfully' });
  }

  // ── DELETE /api/subscribers/admin-:id — admin: remove subscriber ──
  if (req.method === 'DELETE' && action && action.startsWith('admin-')) {
    const user = await requireAuth(req, res);
    if (!user) return;
    const id = action.replace('admin-', '');
    await sql`DELETE FROM subscribers WHERE id = ${parseInt(id)}`;
    return res.json({ message: 'Subscriber removed' });
  }

  return res.status(404).json({ error: 'Not found' });
});
