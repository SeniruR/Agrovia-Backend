const { pool } = require('../config/database');
const { getIO } = require('../utils/socket');
const NotificationModel = require('../models/notification.model');

const PEST_ALERT_TYPE = 'pest_alert';
const WEATHER_ALERT_TYPE = 'weather_alert';

const parseMeta = (metaValue) => {
  if (!metaValue) return null;
  if (typeof metaValue === 'object') return metaValue;
  try {
    return JSON.parse(metaValue);
  } catch (err) {
    console.warn('notificationService: failed to parse meta JSON', err);
    return null;
  }
};

const normalizeNumber = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const extractAlertIdentifiers = (rowType, meta) => {
  const metaTypeRaw = typeof meta?.alertType === 'string' ? meta.alertType : meta?.type;
  const metaType = typeof metaTypeRaw === 'string' ? metaTypeRaw.trim() : null;
  const normalizedRowType = typeof rowType === 'string' ? rowType.trim() : null;

  let resolvedType = normalizedRowType;

  if (!resolvedType && metaType) {
    if (metaType === PEST_ALERT_TYPE || metaType === 'pest') {
      resolvedType = PEST_ALERT_TYPE;
    } else if (metaType === WEATHER_ALERT_TYPE || metaType === 'weather') {
      resolvedType = WEATHER_ALERT_TYPE;
    }
  }

  if (!resolvedType && meta) {
    if (meta.pestAlertId || meta.pest_alert_id || meta.pestalertId || meta.pest_alertId) {
      resolvedType = PEST_ALERT_TYPE;
    } else if (meta.weatherAlertId || meta.weather_alert_id) {
      resolvedType = WEATHER_ALERT_TYPE;
    }
  }

  const candidates = [];

  if (meta) {
    if (resolvedType === PEST_ALERT_TYPE) {
      candidates.push(
        meta.pestAlertId,
        meta.pest_alert_id,
        meta.alertId,
        meta.alert_id,
        meta.pestalertId,
        meta.pest_alertId
      );
    } else if (resolvedType === WEATHER_ALERT_TYPE) {
      candidates.push(
        meta.weatherAlertId,
        meta.weather_alert_id,
        meta.alertId,
        meta.alert_id
      );
    } else {
      candidates.push(meta.alertId, meta.alert_id);
    }
  }

  const alertIdRaw = candidates.find((value) => value !== undefined && value !== null);
  const alertId = normalizeNumber(alertIdRaw);

  return {
    alertId,
    notificationType: resolvedType || null
  };
};

const attachRecommendations = (alerts, recommendations) => {
  const byAlert = alerts.reduce((acc, alert) => {
    acc[alert.id] = {
      ...alert,
      recommendations: []
    };
    return acc;
  }, {});

  recommendations.forEach((row) => {
    if (byAlert[row.pestAlertId]) {
      byAlert[row.pestAlertId].recommendations.push(row.recommendation);
    }
  });

  return byAlert;
};

const attachAreas = (alerts, areas) => {
  const byAlert = alerts.reduce((acc, alert) => {
    acc[alert.id] = {
      ...alert,
      affectedAreas: []
    };
    return acc;
  }, {});

  areas.forEach((row) => {
    if (byAlert[row.weatherAlertId]) {
      byAlert[row.weatherAlertId].affectedAreas.push(row.areaName);
    }
  });

  return byAlert;
};

const NotificationService = {
  async fetchNotificationsForUser(userId, { onlyUnread = false, includeCount = false } = {}) {
    const hasAccess = await NotificationModel.userHasActivePestSubscription(userId);

    if (!hasAccess) {
      if (includeCount) {
        return { notifications: [], unreadCount: 0, hasAccess: false };
      }
      return { notifications: [], hasAccess: false };
    }

    const rows = await NotificationModel.fetchForUser(userId, { onlyUnread });

    if (!rows.length) {
      if (includeCount) {
        const unreadCount = await NotificationModel.countUnreadForUser(userId);
        return { notifications: [], unreadCount, hasAccess: true };
      }
      return { notifications: [], hasAccess: true };
    }

    const pestAlertIds = new Set();
    const weatherAlertIds = new Set();

    const notifications = rows.map((row) => {
      const meta = parseMeta(row.meta);
      const { alertId, notificationType } = extractAlertIdentifiers(row.type, meta);
      const alertCategory = notificationType === WEATHER_ALERT_TYPE
        ? 'weather'
        : notificationType === PEST_ALERT_TYPE
          ? 'pest'
          : null;

      if (alertCategory === 'pest' && typeof alertId === 'number') {
        pestAlertIds.add(alertId);
      }

      if (alertCategory === 'weather' && typeof alertId === 'number') {
        weatherAlertIds.add(alertId);
      }

      const base = {
        id: row.id,
        notification_id: row.id,
        recipientId: row.recipientId,
        recipient_id: row.recipientId,
        type: row.type,
        title: row.title,
        message: row.message,
        meta,
        created_at: row.createdAt,
        assigned_at: row.recipientCreatedAt,
        readAt: row.readAt,
        is_read: row.readAt ? 1 : 0,
        seenInPopup: row.seenInPopup,
        alertId,
        rawMeta: row.meta,
        alertType: notificationType,
        alertCategory
      };

      if (alertCategory === 'pest') {
        base.pest_alert_id = alertId;
        base.pestAlertId = alertId;
      } else if (alertCategory === 'weather') {
        base.weather_alert_id = alertId;
        base.weatherAlertId = alertId;
      }

      return base;
    });

    const pestAlertIdList = [...pestAlertIds];
    const weatherAlertIdList = [...weatherAlertIds];

    let pestAlertsById = {};
    let weatherAlertsById = {};

    if (pestAlertIdList.length) {
      const alertRows = await NotificationModel.fetchAlertsByIds(pestAlertIdList);
      const recommendationRows = await NotificationModel.fetchRecommendationsForAlerts(pestAlertIdList);
      pestAlertsById = attachRecommendations(alertRows, recommendationRows);
    }

    if (weatherAlertIdList.length) {
      const weatherRows = await NotificationModel.fetchWeatherAlertsByIds(weatherAlertIdList);
      const areaRows = await NotificationModel.fetchAreasForWeatherAlerts(weatherAlertIdList);
      weatherAlertsById = attachAreas(weatherRows, areaRows);
    }

    const enriched = notifications.map((notification) => {
      if (notification.alertCategory === 'pest' && notification.alertId) {
        const alert = pestAlertsById[notification.alertId] || null;
        return {
          ...notification,
          pestAlert: alert,
          pestName: alert?.pestName || null,
          pestSeverity: alert?.severity || null
        };
      }

      if (notification.alertCategory === 'weather' && notification.alertId) {
        const alert = weatherAlertsById[notification.alertId] || null;
        return {
          ...notification,
          weatherAlert: alert,
          weatherType: alert?.weatherType || null,
          weatherSeverity: alert?.severity || null
        };
      }

      return notification;
    });

    if (!includeCount) {
      return { notifications: enriched, hasAccess: true };
    }

    const unreadCount = await NotificationModel.countUnreadForUser(userId);
    return { notifications: enriched, unreadCount, hasAccess: true };
  },

  async markNotificationAsRead(notificationId, userId) {
    const hasAccess = await NotificationModel.userHasActivePestSubscription(userId);

    if (!hasAccess) {
      return { hasAccess: false };
    }

    const recipient = await NotificationModel.findRecipientByIdentifier(userId, notificationId);

    if (!recipient) {
      return null;
    }

    await NotificationModel.markRecipientRead(recipient.recipientId);

    const meta = parseMeta(recipient.meta);
    const { alertId, notificationType } = extractAlertIdentifiers(recipient.type, meta);
    const normalizedAlertId = typeof alertId === 'number' ? alertId : null;
    const unreadCount = await NotificationModel.countUnreadForUser(userId);

    const payload = {
      notificationId: recipient.notificationId,
      recipientId: recipient.recipientId,
      recipient_id: recipient.recipientId,
      alertId: normalizedAlertId,
      alertType: notificationType,
      alertCategory: notificationType === WEATHER_ALERT_TYPE ? 'weather' : notificationType === PEST_ALERT_TYPE ? 'pest' : null,
      unreadCount,
      hasAccess: true
    };

    if (notificationType === PEST_ALERT_TYPE) {
      payload.pestAlertId = normalizedAlertId;
    }

    if (notificationType === WEATHER_ALERT_TYPE) {
      payload.weatherAlertId = normalizedAlertId;
    }

    return payload;
  },

  async markNotificationAsSeen(notificationId, userId) {
    const hasAccess = await NotificationModel.userHasActivePestSubscription(userId);

    if (!hasAccess) {
      return { hasAccess: false };
    }

    const recipient = await NotificationModel.findRecipientByIdentifier(userId, notificationId);

    if (!recipient) {
      return null;
    }

    await NotificationModel.markRecipientSeen(recipient.recipientId);

    const meta = parseMeta(recipient.meta);
    const { alertId, notificationType } = extractAlertIdentifiers(recipient.type, meta);
    const normalizedAlertId = typeof alertId === 'number' ? alertId : null;

    return {
      notificationId: recipient.notificationId,
      recipientId: recipient.recipientId,
      recipient_id: recipient.recipientId,
      alertId: normalizedAlertId,
      alertType: notificationType,
      alertCategory: notificationType === WEATHER_ALERT_TYPE ? 'weather' : notificationType === PEST_ALERT_TYPE ? 'pest' : null,
      hasAccess: true
    };
  },

  async createPestAlertNotification({
    pestAlertId,
    pestName,
    severity,
    symptoms,
    moderatorId
  }) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const title = `New Pest Alert: ${pestName}`;
      const symptomText = typeof symptoms === 'string' ? symptoms : '';
      const message = `Severity: ${severity}. Symptoms: ${symptomText.slice(0, 120)}${symptomText.length > 120 ? '…' : ''}`;
      const metaPayload = {
        pestAlertId,
        pestName,
        severity,
        moderatorId,
        alertType: 'pest'
      };
      const meta = JSON.stringify(metaPayload);

      const [notificationResult] = await conn.execute(
        'INSERT INTO notifications (type, title, message, meta) VALUES (?, ?, ?, ?)',
        ['pest_alert', title, message, meta]
      );

      const notificationId = notificationResult.insertId;

      const [recipients] = await conn.execute(
        `SELECT DISTINCT u.id
           FROM users u
           INNER JOIN user_subscriptions us
             ON us.user_id = u.id
            AND us.status = 'active'
            AND us.tier_id IN (5, 6)
          WHERE u.user_type IN ('1', '1.1')
            AND u.is_active = 1`
      );

      const recipientIds = recipients
        .map((row) => Number(row.id))
        .filter((id) => !Number.isNaN(id) && id !== Number(moderatorId));

      if (recipientIds.length) {
        const values = recipientIds.map((userId) => [notificationId, userId]);
        await conn.query(
          'INSERT INTO notification_recipients (notificationId, userId) VALUES ?',
          [values]
        );
      }

      await conn.commit();

      try {
        const io = getIO();
        const recipientRows = await NotificationModel.fetchRecipientsForNotification(notificationId, recipientIds);
        const recipientsByUser = recipientRows.reduce((acc, row) => {
          acc[row.userId] = row.id;
          return acc;
        }, {});

        const payload = {
          id: notificationId,
          notification_id: notificationId,
          type: PEST_ALERT_TYPE,
          title,
          message,
          alertId: pestAlertId,
          pest_alert_id: pestAlertId,
          created_at: new Date().toISOString(),
          meta: metaPayload,
          is_read: 0,
          alertType: PEST_ALERT_TYPE,
          alertCategory: 'pest'
        };

        recipientIds.forEach((userId) => {
          const recipientId = recipientsByUser[userId] || null;
          const enrichedPayload = {
            ...payload,
            recipientId,
            recipient_id: recipientId
          };
          io.to(`user:${userId}`).emit('new_pest_alert', enrichedPayload);
          io.to(`user:${userId}`).emit('new_notification', enrichedPayload);
        });
      } catch (socketError) {
        console.warn('notificationService: socket broadcast failed', socketError.message);
      }

      return { notificationId, recipientIds };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async createWeatherAlertNotification({
    weatherAlertId,
    weatherType,
    severity,
    description,
    moderatorId,
    affectedAreas = [],
    dateIssued = null
  }) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const title = `Weather Alert: ${weatherType}`;
      const descriptionText = typeof description === 'string' ? description : '';
      const message = `Severity: ${severity}. ${descriptionText.slice(0, 120)}${descriptionText.length > 120 ? '…' : ''}`;
      const metaPayload = {
        weatherAlertId,
        weatherType,
        severity,
        moderatorId,
        alertType: 'weather',
        affectedAreas,
        dateIssued
      };
      const meta = JSON.stringify(metaPayload);

      const [notificationResult] = await conn.execute(
        'INSERT INTO notifications (type, title, message, meta) VALUES (?, ?, ?, ?)',
        [WEATHER_ALERT_TYPE, title, message, meta]
      );

      const notificationId = notificationResult.insertId;

      const [recipients] = await conn.execute(
        `SELECT DISTINCT u.id
           FROM users u
           INNER JOIN user_subscriptions us
             ON us.user_id = u.id
            AND us.status = 'active'
            AND us.tier_id IN (5, 6)
          WHERE u.user_type IN ('1', '1.1')
            AND u.is_active = 1`
      );

      const recipientIds = recipients
        .map((row) => Number(row.id))
        .filter((id) => !Number.isNaN(id) && id !== Number(moderatorId));

      if (recipientIds.length) {
        const values = recipientIds.map((userId) => [notificationId, userId]);
        await conn.query(
          'INSERT INTO notification_recipients (notificationId, userId) VALUES ?',
          [values]
        );
      }

      await conn.commit();

      try {
        const io = getIO();
        const recipientRows = await NotificationModel.fetchRecipientsForNotification(notificationId, recipientIds);
        const recipientsByUser = recipientRows.reduce((acc, row) => {
          acc[row.userId] = row.id;
          return acc;
        }, {});

        const payload = {
          id: notificationId,
          notification_id: notificationId,
          type: WEATHER_ALERT_TYPE,
          title,
          message,
          alertId: weatherAlertId,
          weather_alert_id: weatherAlertId,
          created_at: new Date().toISOString(),
          meta: metaPayload,
          is_read: 0,
          alertType: WEATHER_ALERT_TYPE,
          alertCategory: 'weather'
        };

        recipientIds.forEach((userId) => {
          const recipientId = recipientsByUser[userId] || null;
          const enrichedPayload = {
            ...payload,
            recipientId,
            recipient_id: recipientId
          };
          io.to(`user:${userId}`).emit('new_weather_alert', enrichedPayload);
          io.to(`user:${userId}`).emit('new_notification', enrichedPayload);
        });
      } catch (socketError) {
        console.warn('notificationService: socket broadcast failed', socketError.message);
      }

      return { notificationId, recipientIds };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
};

module.exports = NotificationService;
