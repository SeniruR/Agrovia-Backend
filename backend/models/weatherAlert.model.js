const { pool } = require('../config/database');

const WeatherAlertModel = {
  async createWeatherAlert(moderatorId, weatherType, description, severity, affectedAreas, dateIssued = null) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO WeatherAlerts (moderatorId, weatherType, description, severity, dateIssued)
         VALUES (?, ?, ?, ?, COALESCE(?, NOW()))`,
        [moderatorId, weatherType, description, severity, dateIssued]
      );

      const weatherAlertId = result.insertId;

      if (Array.isArray(affectedAreas) && affectedAreas.length > 0) {
        const cleanedAreas = affectedAreas
          .map((area) => (typeof area === 'string' ? area.trim() : ''))
          .filter((area) => area.length > 0);

        if (cleanedAreas.length) {
          const values = cleanedAreas.map((area) => [weatherAlertId, area]);
          await conn.query(
            'INSERT INTO WeatherAlertAreas (weatherAlertId, areaName) VALUES ?',
            [values]
          );
        }
      }

      await conn.commit();
      return weatherAlertId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async getAllWeatherAlerts() {
    const [rows] = await pool.execute(
      `SELECT wa.*, 
              u.full_name AS authorName,
              u.email AS authorEmail,
              GROUP_CONCAT(DISTINCT waa.areaName ORDER BY waa.id SEPARATOR '|||') AS affectedAreas
         FROM WeatherAlerts wa
         LEFT JOIN WeatherAlertAreas waa ON waa.weatherAlertId = wa.id
         LEFT JOIN users u ON u.id = wa.moderatorId
        GROUP BY wa.id
        ORDER BY wa.createdAt DESC`
    );

    return rows.map((row) => ({
      ...row,
      affectedAreas: row.affectedAreas
        ? row.affectedAreas.split('|||').filter(Boolean)
        : []
    }));
  },

  async findById(alertId) {
    const [rows] = await pool.execute(
      `SELECT wa.*,
              u.full_name AS authorName,
              u.email AS authorEmail
         FROM WeatherAlerts wa
         LEFT JOIN users u ON u.id = wa.moderatorId
        WHERE wa.id = ?
        LIMIT 1`,
      [alertId]
    );

    if (!rows.length) {
      return null;
    }

    const alert = rows[0];

    const [areas] = await pool.execute(
      'SELECT areaName FROM WeatherAlertAreas WHERE weatherAlertId = ? ORDER BY id',
      [alertId]
    );

    return {
      ...alert,
      affectedAreas: areas.map((row) => row.areaName)
    };
  },

  async deleteWeatherAlert(alertId) {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [notificationRows] = await conn.query(
        `SELECT id
           FROM notifications
          WHERE type = 'weather_alert'
            AND (
              JSON_UNQUOTE(JSON_EXTRACT(CAST(meta AS JSON), '$.weatherAlertId')) = ? OR
              JSON_UNQUOTE(JSON_EXTRACT(CAST(meta AS JSON), '$.weather_alert_id')) = ?
            )`,
        [String(alertId), String(alertId)]
      );

      const notificationIds = notificationRows.map((row) => row.id);

      if (notificationIds.length) {
        const placeholders = notificationIds.map(() => '?').join(', ');

        await conn.query(
          `DELETE FROM notification_recipients WHERE notificationId IN (${placeholders})`,
          notificationIds
        );

        await conn.query(
          `DELETE FROM notifications WHERE id IN (${placeholders})`,
          notificationIds
        );
      }

      await conn.execute('DELETE FROM WeatherAlerts WHERE id = ?', [alertId]);

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
};

module.exports = WeatherAlertModel;
