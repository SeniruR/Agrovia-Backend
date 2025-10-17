const express = require('express');
const router = express.Router();
const pestAlertController = require('../controllers/pestAlert.controller');
const { authenticate } = require('../middleware/auth'); // Import the authenticate function

router.post('/pest-alert', authenticate, pestAlertController.createPestAlert);

module.exports = router;
