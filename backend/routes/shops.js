const express = require('express');
const router = express.Router();
const { searchShops, getShopById } = require('../controllers/shopController');

// GET /api/v1/shops?search=...
router.get('/', searchShops);

// GET /api/v1/shops/:id
router.get('/:id', getShopById);

module.exports = router;
