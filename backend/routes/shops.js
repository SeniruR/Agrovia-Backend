const express = require('express');
const router = express.Router();
const { searchShops } = require('../controllers/shopController');

// GET /api/v1/shops?search=...
router.get('/', searchShops);

module.exports = router;
