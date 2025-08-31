const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const driverController = require('../controllers/driverController');

// Return deliveries assigned to the authenticated transporter
router.get('/deliveries', authenticate, authorize('transporter'), driverController.getDeliveriesForTransporter);

module.exports = router;
