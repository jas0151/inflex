const express = require('express');
const { getDb } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/subscribers — public: subscribe
router.post('/', (req, res) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const db = getDb();

  // Check if already subscribed
  const existing = db.prepare('SELECT * FROM subscribers WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    if (existing.is_active) {
      return res.json({ message: 'Already subscribed' });
    }
    // Reactivate
    db.prepare('UPDATE subscribers SET is_active = 1, name = ? WHERE id = ?').run(name || existing.name, existing.id);
    return res.json({ message: 'Subscription reactivated' });
  }

  db.prepare('INSERT INTO subscribers (email, name) VALUES (?, ?)').run(email.toLowerCase(), name || '');
  res.status(201).json({ message: 'Subscribed successfully' });
});

// DELETE /api/subscribers/:email — public: unsubscribe
router.delete('/:email', (req, res) => {
  const db = getDb();
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const result = db.prepare('UPDATE subscribers SET is_active = 0 WHERE email = ?').run(email);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Email not found' });
  }
  res.json({ message: 'Unsubscribed successfully' });
});

// GET /api/subscribers — admin only: list all subscribers
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const subscribers = db.prepare('SELECT id, email, name, is_active, subscribed_at FROM subscribers ORDER BY subscribed_at DESC').all();
  const active = subscribers.filter(s => s.is_active).length;
  res.json({ subscribers, total: subscribers.length, active });
});

// DELETE /api/subscribers/admin/:id — admin only: remove subscriber
router.delete('/admin/:id', requireAuth, (req, res) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM subscribers WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Subscriber not found' });
  }
  res.json({ message: 'Subscriber removed' });
});

module.exports = router;
