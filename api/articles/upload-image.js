const { withErrorHandling, initDb } = require('../_db');
const { requireAuth } = require('../_auth');

module.exports = withErrorHandling(async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await initDb();
  const user = await requireAuth(req, res);
  if (!user) return;

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image data provided. Send base64 data URL.' });
  }

  if (!image.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid image format. Must be a base64 data URL.' });
  }

  return res.json({ url: image });
});
