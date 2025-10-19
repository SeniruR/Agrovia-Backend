const NotificationService = require('../services/notificationService');

exports.getMyNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notifications = await NotificationService.fetchNotificationsForUser(userId, { onlyUnread: true });
    return res.json(notifications);
  } catch (error) {
    console.error('getMyNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
};

exports.getAllNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const notifications = await NotificationService.fetchNotificationsForUser(userId, { onlyUnread: false });
    return res.json(notifications);
  } catch (error) {
    console.error('getAllNotifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const notificationId = Number(req.params.notificationId);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!notificationId || Number.isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification identifier' });
    }

    const result = await NotificationService.markNotificationAsRead(notificationId, userId);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
};

exports.markNotificationSeen = async (req, res) => {
  try {
    const userId = req.user?.id;
    const notificationId = Number(req.params.notificationId);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!notificationId || Number.isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification identifier' });
    }

    const result = await NotificationService.markNotificationAsSeen(notificationId, userId);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('markNotificationSeen error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
};
