const express = require('express');
const path = require('path');
const articlesRouter = require('./routes/articles');
const authRouter = require('./routes/auth');
const subscribersRouter = require('./routes/subscribers');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/articles', articlesRouter);

// Start server
app.listen(PORT, () => {
  console.log(`Inflex server running at http://localhost:${PORT}`);
});
