const { pool } = require('../config/database');
const { getIO } = require('../utils/socket');

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

const buildPlaceholders = (values) => values.map(() => '?').join(', ');

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
  async fetchNotificationsForUser(userId, { onlyUnread = false } = {}) {
    const filters = [userId];
    let unreadClause = '';
    if (onlyUnread) {
      unreadClause = 'AND nr.readAt IS NULL';
    }

    const [rows] = await pool.query(
      `SELECT 
         nr.id AS recipientId,
         nr.notificationId,
         nr.userId,
         nr.readAt,
         nr.createdAt AS recipientCreatedAt,
         nr.seenInPopup,
         n.id AS id,
         n.type,
         n.title,
         n.message,
         n.meta,
         n.createdAt
       FROM notification_recipients nr
       INNER JOIN notifications n ON n.id = nr.notificationId
       WHERE nr.userId = ?
         ${unreadClause}
       ORDER BY n.createdAt DESC`,
      filters
    );

    if (!rows.length) {
      return [];
    }

    const notifications = rows.map((row) => {
      const meta = parseMeta(row.meta);
      const alertIdRaw = extractAlertId(meta);
      const alertId = alertIdRaw ? Number(alertIdRaw) : null;

      return {
        id: row.id,
        notification_id: row.id,
        recipientId: row.recipientId,
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

    const placeholders = buildPlaceholders(relevantAlertIds);

    const [alertRows] = await pool.query(
      `SELECT 
         id,
         moderatorId,
         pestName,
         symptoms,
         severity,
         createdAt
       FROM PestAlerts
       WHERE id IN (${placeholders})`,
      relevantAlertIds
    );

    const [recommendationRows] = await pool.query(
      `SELECT pestAlertId, recommendation
       FROM PestRecommendations
       WHERE pestAlertId IN (${placeholders})`,
      relevantAlertIds
    );

    const alertsById = attachRecommendations(alertRows, recommendationRows);

    return notifications.map((notification) => {
      const alert = notification.alertId ? alertsById[notification.alertId] || null : null;
      return {
        ...notification,
        pestAlert: alert,
        pestName: alert?.pestName || null,
        pestSeverity: alert?.severity || null
      };
    });
  },

  async markNotificationAsRead(notificationId, userId) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        `SELECT 
           nr.id AS recipientId,
           nr.notificationId,
           n.meta
         FROM notification_recipients nr
         INNER JOIN notifications n ON n.id = nr.notificationId
         WHERE nr.userId = ?
           AND (nr.notificationId = ? OR nr.id = ?)
         LIMIT 1`,
        [userId, notificationId, notificationId]
      );

      if (!rows.length) {
        await conn.rollback();
        return null;
      }

      const row = rows[0];

      await conn.execute(
        'UPDATE notification_recipients SET readAt = NOW() WHERE id = ? AND readAt IS NULL',
        [row.recipientId]
      );

      await conn.commit();

      const meta = parseMeta(row.meta);
      const alertId = extractAlertId(meta);

      return {
        notificationId: row.notificationId,
        recipientId: row.recipientId,
        alertId: alertId ? Number(alertId) : null
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async markNotificationAsSeen(notificationId, userId) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [rows] = await conn.execute(
        `SELECT id
         FROM notification_recipients
         WHERE userId = ?
           AND (notificationId = ? OR id = ?)
         LIMIT 1`,
        [userId, notificationId, notificationId]
      );

      if (!rows.length) {
        await conn.rollback();
        return null;
      }

      const recipientId = rows[0].id;

      await conn.execute(
        'UPDATE notification_recipients SET seenInPopup = NOW() WHERE id = ? AND seenInPopup IS NULL',
        [recipientId]
      );

      await conn.commit();

      return { notificationId, recipientId };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
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
        `SELECT id FROM users WHERE user_type IN ('1', '1.1') AND is_active = 1`
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
          io.to(`user:${userId}`).emit('new_pest_alert', payload);
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
