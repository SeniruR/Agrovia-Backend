const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportAllocationController');

// Create a new transport allocation
router.post('/', transportController.createTransportAllocation);

module.exports = router;
