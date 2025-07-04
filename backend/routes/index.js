const express = require('express');
const authRoutes = require('./auth');
const organizationRoutes = require('./organizations');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Agrovia API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);

module.exports = router;
