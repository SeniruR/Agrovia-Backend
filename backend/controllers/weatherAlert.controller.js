const WeatherAlertModel = require('../models/weatherAlert.model');
const NotificationService = require('../services/notificationService');

const extractUserId = (user, fallbackId) => {
  if (!user) {
    return fallbackId || null;
  }

  return user.id || user._id || fallbackId || null;
};

const userCanManageAlerts = (user) => {
  if (!user) {
    return false;
  }

  const rawType = user.user_type ?? user.type;
  const typeStr = rawType ? rawType.toString() : '';
  return typeStr === '0' || typeStr === '5' || typeStr === '5.1';
};

exports.createWeatherAlert = async (req, res) => {
  try {
    const { weatherType, description, severity, affectedAreas = [], postedByUserId, dateIssued } = req.body;
    const moderatorId = extractUserId(req.user, postedByUserId);

    if (!moderatorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!userCanManageAlerts(req.user)) {
      return res.status(403).json({ error: 'Insufficient permissions to create weather alerts' });
    }

    if (!weatherType || !description || !severity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const alertId = await WeatherAlertModel.createWeatherAlert(
      moderatorId,
      weatherType,
      description,
      severity,
      Array.isArray(affectedAreas) ? affectedAreas : [],
      dateIssued
    );

    try {
      await NotificationService.createWeatherAlertNotification({
        weatherAlertId: alertId,
        weatherType,
        severity,
        description,
        affectedAreas: Array.isArray(affectedAreas) ? affectedAreas : [],
        moderatorId,
        dateIssued: dateIssued || null
      });
    } catch (notificationError) {
      console.warn('Failed to dispatch weather alert notifications:', notificationError.message);
    }

    return res.status(201).json({
      message: 'Weather alert created successfully',
      weatherAlertId: alertId
    });
  } catch (error) {
    console.error('createWeatherAlert error:', error);
    return res.status(500).json({ error: 'Failed to create weather alert' });
  }
};

exports.getAllWeatherAlerts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const alerts = await WeatherAlertModel.getAllWeatherAlerts();

    const formatted = alerts.map((alert) => ({
      id: alert.id,
      _id: alert.id,
      title: alert.weatherType,
      weatherType: alert.weatherType,
      description: alert.description,
      severity: alert.severity,
      dateIssued: alert.dateIssued,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
      authorName: alert.authorName || 'Weather Department',
      authorEmail: alert.authorEmail || null,
      postedByUserId: alert.moderatorId,
      moderatorId: alert.moderatorId,
      affectedAreas: alert.affectedAreas || []
    }));

    return res.json(formatted);
  } catch (error) {
    console.error('getAllWeatherAlerts error:', error);
    return res.status(500).json({ error: 'Failed to load weather alerts' });
  }
};

exports.deleteWeatherAlert = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const alertId = Number(req.params.id);

    if (!alertId || Number.isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid weather alert identifier' });
    }

    const alert = await WeatherAlertModel.findById(alertId);

    if (!alert) {
      return res.status(404).json({ error: 'Weather alert not found' });
    }

    const moderatorId = extractUserId(req.user);

    if (String(alert.moderatorId) !== String(moderatorId)) {
      return res.status(403).json({ error: 'You can only delete alerts you created' });
    }

    await WeatherAlertModel.deleteWeatherAlert(alertId);

    return res.json({ message: 'Weather alert deleted successfully' });
  } catch (error) {
    console.error('deleteWeatherAlert error:', error);
    return res.status(500).json({ error: 'Failed to delete weather alert' });
  }
};
