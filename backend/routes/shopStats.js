const express = require('express');
const router = express.Router();
const { getShopStatistics } = require('../controllers/shopStatsController');
const { authenticate } = require('../middleware/auth');

// Get shop statistics for authenticated shop owner
router.get('/statistics', authenticate, getShopStatistics);

module.exports = router;
