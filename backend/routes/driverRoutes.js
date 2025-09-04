const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const driverController = require('../controllers/driverController');

// Return deliveries assigned to the authenticated transporter
router.get('/deliveries', authenticate, authorize('transporter'), driverController.getDeliveriesForTransporter);

// Update delivery status for the authenticated transporter
router.patch('/deliveries/:id/status', authenticate, authorize('transporter'), driverController.updateDeliveryStatus);

// Delete a completed delivery for the authenticated transporter
router.delete('/deliveries/:id', authenticate, authorize('transporter'), driverController.deleteDelivery);

module.exports = router;
