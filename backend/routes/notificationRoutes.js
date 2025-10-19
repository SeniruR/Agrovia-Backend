const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// More secure route - get unread notifications for the currently authenticated user (for popup)
router.get('/my-notifications', authenticate, notificationController.getMyNotifications);

// Get ALL notifications for the currently authenticated user (for notifications page)
router.get('/all-my-notifications', authenticate, notificationController.getAllMyNotifications);

// Get unread notification count
router.get('/unread-count', authenticate, notificationController.getUnreadCount);

// Mark a specific notification as read
router.post('/mark-read/:notificationId', authenticate, notificationController.markAsRead);

// Mark all notifications as read
router.post('/mark-all-read', authenticate, notificationController.markAllAsRead);

// Keep the old route for backward compatibility but add proper security
router.get('/farmer/:id', authenticate, notificationController.getFarmerNotifications);

module.exports = router;