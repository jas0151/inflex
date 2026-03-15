module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image data provided. Send base64 data URL.' });
  }

  // On Vercel, there's no persistent filesystem.
  // Images are sent as base64 data URLs and stored directly in article content/cover_image.
  // This endpoint validates the format and returns it back.
  if (!image.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Invalid image format. Must be a base64 data URL.' });
  }

  return res.json({ url: image });
};
