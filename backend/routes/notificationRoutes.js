const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// More secure route - get notifications for the currently authenticated user
router.get('/my-notifications', authenticate, notificationController.getMyNotifications);

// Keep the old route for backward compatibility but add proper security
router.get('/farmer/:id', authenticate, notificationController.getFarmerNotifications);

module.exports = router;