const Notification = require('../models/Notification');

// Get notifications for the currently authenticated user (recommended approach)
exports.getMyNotifications = async (req, res) => {
  try {
    // req.user.id is automatically populated by the authenticate middleware
    const farmerId = req.user.id;
    console.log('Fetching notifications for authenticated user:', farmerId);
    
    const notifications = await Notification.getForFarmer(farmerId);
    console.log('Found notifications:', notifications.length);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch notifications', details: err.message });
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
    const notifications = await Notification.getForFarmer(farmerId);
    console.log('Found notifications:', notifications.length);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};