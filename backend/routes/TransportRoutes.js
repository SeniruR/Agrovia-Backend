const express = require('express');
const router = express.Router();
const transportController = require('../controllers/TransportAllocationController');

// Create a new transport allocation
router.post('/', transportController.createTransportAllocation);


// Get all transport allocations
router.get('/', transportController.getAllTransportAllocations);

// Get allocations for a specific cart item
router.get('/cart/:cart_item_id', transportController.getByCartItem);

module.exports = router;
