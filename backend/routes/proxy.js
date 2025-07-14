// Proxy route for GN Division search
const express = require('express');
const router = express.Router();

// Import the GN Division proxy router
const gnDivisionProxy = require('../proxy/gn-division-proxy.cjs');

// Mount at /api/proxy
router.use('/', gnDivisionProxy);

module.exports = router;
