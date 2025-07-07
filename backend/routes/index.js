const express = require('express');

const authRoutes = require('./auth');
const organizationRoutes = require('./organizations');
const farmerRoutes = require('./farmers');

const shopProductRoutes = require('./shopProductRoutes');

const cropPostRoutes = require('./cropPosts');
const userRoutes = require('./users');
const shopComplaintRoutes = require('./shopComplaint');


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
router.use('/farmers', farmerRoutes);

router.use('/shop-products', shopProductRoutes);

router.use('/crop-posts', cropPostRoutes);
router.use('/users', userRoutes);
router.use('/shop-complaints', shopComplaintRoutes);


module.exports = router;
