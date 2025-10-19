const { pool } = require('../config/database');

const NotificationModel = {
  async fetchForUser(userId, { onlyUnread = false } = {}) {
    const params = [userId];
    let sql = `SELECT 
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
       WHERE nr.userId = ?`;

    if (onlyUnread) {
      sql += ' AND nr.readAt IS NULL';
    }

    sql += ' ORDER BY n.createdAt DESC';

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async findRecipientByIdentifier(userId, identifier) {
    const [rows] = await pool.query(
      `SELECT 
         nr.id AS recipientId,
         nr.notificationId,
         n.meta,
         n.type
       FROM notification_recipients nr
       INNER JOIN notifications n ON n.id = nr.notificationId
       WHERE nr.userId = ?
         AND (nr.notificationId = ? OR nr.id = ?)
       LIMIT 1`,
      [userId, identifier, identifier]
    );

    return rows[0] || null;
  },

  async markRecipientRead(recipientId) {
    return pool.execute(
      'UPDATE notification_recipients SET readAt = NOW() WHERE id = ? AND readAt IS NULL',
      [recipientId]
    );
  },

  async markRecipientSeen(recipientId) {
    return pool.execute(
      'UPDATE notification_recipients SET seenInPopup = NOW() WHERE id = ? AND seenInPopup IS NULL',
      [recipientId]
    );
  },

  async countUnreadForUser(userId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS unreadCount FROM notification_recipients WHERE userId = ? AND readAt IS NULL',
      [userId]
    );
    return Number(rows[0]?.unreadCount || 0);
  },

  async fetchAlertsByIds(alertIds) {
    if (!alertIds.length) {
      return [];
    }

    const placeholders = alertIds.map(() => '?').join(', ');

    const [rows] = await pool.query(
      `SELECT 
         id,
         moderatorId,
         pestName,
         symptoms,
         severity,
         createdAt
       FROM PestAlerts
       WHERE id IN (${placeholders})`,
      alertIds
    );

    return rows;
  },

  async fetchRecommendationsForAlerts(alertIds) {
    if (!alertIds.length) {
      return [];
    }

    const placeholders = alertIds.map(() => '?').join(', ');

    const [rows] = await pool.query(
      `SELECT pestAlertId, recommendation
       FROM PestRecommendations
       WHERE pestAlertId IN (${placeholders})`,
      alertIds
    );

    return rows;
  },

  async fetchWeatherAlertsByIds(alertIds) {
    if (!alertIds.length) {
      return [];
    }

    const placeholders = alertIds.map(() => '?').join(', ');

    const [rows] = await pool.query(
      `SELECT 
         wa.id,
         wa.moderatorId,
         wa.weatherType,
         wa.description,
         wa.severity,
         wa.dateIssued,
         wa.createdAt,
         u.full_name AS authorName,
         u.email AS authorEmail
       FROM WeatherAlerts wa
       LEFT JOIN users u ON u.id = wa.moderatorId
       WHERE wa.id IN (${placeholders})`,
      alertIds
    );

    return rows;
  },

  async fetchAreasForWeatherAlerts(alertIds) {
    if (!alertIds.length) {
      return [];
    }

    const placeholders = alertIds.map(() => '?').join(', ');

    const [rows] = await pool.query(
      `SELECT weatherAlertId, areaName
         FROM WeatherAlertAreas
         WHERE weatherAlertId IN (${placeholders})
         ORDER BY id`,
      alertIds
    );

    return rows;
  },

  async fetchRecipientsForNotification(notificationId, userIds) {
    const params = [notificationId];
    let sql = 'SELECT id, userId FROM notification_recipients WHERE notificationId = ?';

    if (Array.isArray(userIds) && userIds.length) {
      const placeholders = userIds.map(() => '?').join(', ');
      sql += ` AND userId IN (${placeholders})`;
      params.push(...userIds);
    }

    const [rows] = await pool.query(sql, params);
    return rows;
  },

  async userHasActivePestSubscription(userId) {
    const [rows] = await pool.query(
      `SELECT 1
         FROM user_subscriptions
        WHERE user_id = ?
          AND status = 'active'
          AND tier_id IN (5, 6)
        LIMIT 1`,
      [userId]
    );

    return rows.length > 0;
  }
};

module.exports = NotificationModel;
