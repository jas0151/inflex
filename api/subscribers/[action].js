const { getSql, initDb, withErrorHandling } = require('../_db');
const { requireAuth } = require('../_auth');

module.exports = withErrorHandling(async function handler(req, res) {
  await initDb();
  const sql = getSql();
  const action = req.query.action;

  // DELETE /api/subscribers/:email — public: unsubscribe by email
  if (req.method === 'DELETE' && action && action.includes('@')) {
    const email = decodeURIComponent(action).toLowerCase();
    const result = await sql`UPDATE subscribers SET is_active = FALSE WHERE email = ${email}`;
    if (!result.length && result.count === 0) {
      return res.status(404).json({ error: 'Email not found' });
    }
    return res.json({ message: 'Unsubscribed successfully' });
  }

  // DELETE /api/subscribers/admin/:id — admin: remove subscriber by id
  if (req.method === 'DELETE' && action && action.startsWith('admin-')) {
    const user = await requireAuth(req, res);
    if (!user) return;
    const id = action.replace('admin-', '');
    await sql`DELETE FROM subscribers WHERE id = ${parseInt(id)}`;
    return res.json({ message: 'Subscriber removed' });
  }

  res.status(404).json({ error: 'Not found' });
});
