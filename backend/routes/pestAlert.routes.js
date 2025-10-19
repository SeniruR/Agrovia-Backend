const express = require('express');
const router = express.Router();
const pestAlertController = require('../controllers/pestAlert.controller');
const { authenticate } = require('../middleware/auth'); // Import the authenticate function

router.post('/pest-alert', authenticate, pestAlertController.createPestAlert);
router.get('/pest-alert', authenticate, pestAlertController.getAllPestAlerts);
router.delete('/pest-alert/:id', authenticate, pestAlertController.deletePestAlert);

module.exports = router;
