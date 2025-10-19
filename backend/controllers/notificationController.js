const Notification = require('../models/Notification');

// Get unread notifications for the currently authenticated user (for popup)
exports.getMyNotifications = async (req, res) => {
  try {
    // req.user.id is automatically populated by the authenticate middleware
    const farmerId = req.user.id;
    console.log('Fetching unread notifications for authenticated user:', farmerId);
    
    const notifications = await Notification.getUnreadForFarmer(farmerId);
    console.log('Found unread notifications:', notifications.length);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
  }
};

// Get ALL notifications for the currently authenticated user (for notifications page)
exports.getAllMyNotifications = async (req, res) => {
  try {
    // req.user.id is automatically populated by the authenticate middleware
    const farmerId = req.user.id;
    console.log('Fetching ALL notifications for authenticated user:', farmerId);
    
    const notifications = await Notification.getAllForFarmer(farmerId);
    console.log('Found total notifications:', notifications.length);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching all notifications:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch all notifications', details: err.message });
  }
};

// Get unread notification count for authenticated user
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Fetching unread count for authenticated user:', userId);
    
    const count = await Notification.getUnreadCount(userId);
    console.log('Unread count:', count);
    res.json({ unread_count: count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to fetch unread count', details: err.message });
  }
};

// Mark a specific notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    const userId = req.user.id;
    
    console.log('Marking notification as read:', { notificationId, userId });
    
    const success = await Notification.markAsRead(notificationId, userId);
    
    if (success) {
      res.json({ message: 'Notification marked as read successfully' });
    } else {
      res.status(404).json({ error: 'Notification not found or already read' });
    }
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ error: 'Failed to mark notification as read', details: err.message });
  }
};

// Mark all notifications as read for authenticated user
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Marking all notifications as read for user:', userId);
    
    const count = await Notification.markAllAsRead(userId);
    
    res.json({ 
      message: 'All notifications marked as read successfully', 
      marked_count: count 
    });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read', details: err.message });
  }
};

// Original route with security check (for backward compatibility)
exports.getFarmerNotifications = async (req, res) => {
  const farmerId = req.params.id;
  const requestingUserId = req.user?.id;
  
  console.log('getFarmerNotifications called:', { farmerId, requestingUserId });
  
  try {
    // Security check: users can only access their own notifications
    // Convert both to strings for comparison to avoid type issues
    if (String(requestingUserId) !== String(farmerId)) {
      console.log('Access denied: User', requestingUserId, 'tried to access notifications for user', farmerId);
      return res.status(403).json({ error: 'You can only access your own notifications' });
    }
    
    console.log('Access granted, fetching notifications for user:', farmerId);
    const notifications = await Notification.getUnreadForFarmer(farmerId);
    console.log('Found notifications:', notifications.length);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};