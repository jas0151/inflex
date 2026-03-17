const { getSql, initDb, withErrorHandling } = require('../_db');
const { requireAuth } = require('../_auth');

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();

  // POST — public: subscribe
  if (req.method === 'POST') {
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

  // GET — admin only: list subscribers
  if (req.method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) return;

    const subscribers = await sql`SELECT id, email, name, is_active, subscribed_at FROM subscribers ORDER BY subscribed_at DESC`;
    const active = subscribers.filter(s => s.is_active).length;
    return res.json({ subscribers, total: subscribers.length, active });
  }

  res.status(405).json({ error: 'Method not allowed' });
});
