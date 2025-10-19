const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');

router.get('/my-notifications', authenticate, notificationController.getMyNotifications);
router.get('/all-my-notifications', authenticate, notificationController.getAllNotifications);
router.post('/mark-read/:notificationId', authenticate, notificationController.markNotificationRead);
router.post('/mark-seen/:notificationId', authenticate, notificationController.markNotificationSeen);

module.exports = router;
