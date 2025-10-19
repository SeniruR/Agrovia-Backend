const { pool } = require('../config/database');

const Notification = {
  create: async (title, message, type) => {
    const [result] = await pool.execute(
      'INSERT INTO notifications (title, message, type, createdAt) VALUES (?, ?, ?, NOW())',
      [title, message, type]
    );
    return result.insertId;
  },
  addRecipients: async (notificationId, farmerIds) => {
    const values = farmerIds.map(id => [notificationId, id]);
    await pool.execute(
      'INSERT INTO notification_recipients (notificationId, userId) VALUES ?',
      [values]
    );
  },
  getForFarmer: async (farmerId) => {
    try {
      console.log('Executing SQL query for farmer ID:', farmerId);
      const [rows] = await pool.execute(
        `SELECT n.* FROM notifications n
         JOIN notification_recipients nr ON n.id = nr.notificationId
         WHERE nr.userId = ? ORDER BY n.createdAt DESC`,
        [farmerId]
      );
      console.log('SQL query successful, returned rows:', rows.length);
      return rows;
    } catch (error) {
      console.error('SQL Error in getForFarmer:', error.message);
      console.error('SQL Error details:', error);
      throw error;
    }
  }
};

module.exports = Notification;