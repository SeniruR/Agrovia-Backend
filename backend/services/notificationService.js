const { pool } = require('../config/database');
const { getIO } = require('../utils/socket');
const NotificationModel = require('../models/notification.model');

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

const extractAlertId = (meta) => {
  if (!meta) return null;
  return (
    meta.pestAlertId ||
    meta.alertId ||
    meta.pest_alert_id ||
    meta.pestalertId ||
    meta.pest_alertId ||
    null
  );
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

    const notifications = rows.map((row) => {
      const meta = parseMeta(row.meta);
      const alertIdRaw = extractAlertId(meta);
      const alertId = alertIdRaw ? Number(alertIdRaw) : null;

      return {
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
        pest_alert_id: alertId,
        rawMeta: row.meta
      };
    });

    const relevantAlertIds = [...new Set(
      notifications
        .map((n) => n.alertId)
        .filter((value) => typeof value === 'number' && !Number.isNaN(value))
    )];

    if (relevantAlertIds.length === 0) {
      return notifications;
    }

    const alertRows = await NotificationModel.fetchAlertsByIds(relevantAlertIds);
    const recommendationRows = await NotificationModel.fetchRecommendationsForAlerts(relevantAlertIds);

    const alertsById = attachRecommendations(alertRows, recommendationRows);

    const enriched = notifications.map((notification) => {
      const alert = notification.alertId ? alertsById[notification.alertId] || null : null;
      return {
        ...notification,
        pestAlert: alert,
        pestName: alert?.pestName || null,
        pestSeverity: alert?.severity || null
      };
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
    const alertId = extractAlertId(meta);
    const unreadCount = await NotificationModel.countUnreadForUser(userId);

    return {
      notificationId: recipient.notificationId,
      recipientId: recipient.recipientId,
      recipient_id: recipient.recipientId,
      alertId: alertId ? Number(alertId) : null,
      unreadCount,
      hasAccess: true
    };
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

    return {
      notificationId: recipient.notificationId,
      recipientId: recipient.recipientId,
      recipient_id: recipient.recipientId,
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
      const meta = JSON.stringify({
        pestAlertId,
        pestName,
        severity,
        moderatorId
      });

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
          type: 'pest_alert',
          title,
          message,
          alertId: pestAlertId,
          pest_alert_id: pestAlertId,
          created_at: new Date().toISOString(),
          meta: { pestAlertId, pestName, severity, moderatorId },
          is_read: 0
        };

        recipientIds.forEach((userId) => {
          const recipientId = recipientsByUser[userId] || null;
          io.to(`user:${userId}`).emit('new_pest_alert', {
            ...payload,
            recipientId,
            recipient_id: recipientId
          });
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
