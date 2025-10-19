const { pool } = require('../config/database');

const Notification = {
  create: async (title, message, type) => {
    try {
      console.log(`📝 Creating notification: ${title} (type: ${type})`);
      const [result] = await pool.execute(
        'INSERT INTO notifications (title, message, type, createdAt) VALUES (?, ?, ?, NOW())',
        [title, message, type]
      );
      const notificationId = result.insertId;
      console.log(`✅ Notification created successfully with ID: ${notificationId}`);
      return notificationId;
    } catch (error) {
      console.error('❌ Failed to create notification:', error.message);
      throw error;
    }
  },
  addRecipients: async (notificationId, farmerIds) => {
    if (!notificationId) {
      console.error('❌ No notification ID provided');
      return;
    }
    
    if (!farmerIds || farmerIds.length === 0) {
      console.log('⚠️ No farmer IDs provided for notifications');
      return;
    }
    
    console.log(`👥 Adding ${farmerIds.length} recipients for notification ${notificationId}:`, farmerIds);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Use individual INSERT statements for better error handling
    for (const farmerId of farmerIds) {
      try {
        await pool.execute(
          'INSERT INTO notification_recipients (notificationId, userId, createdAt) VALUES (?, ?, NOW())',
          [notificationId, farmerId]
        );
        successCount++;
        console.log(`✓ Added recipient ${farmerId} to notification ${notificationId}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to add recipient ${farmerId} for notification ${notificationId}:`, error.message);
      }
    }
    
    console.log(`📊 Recipients summary for notification ${notificationId}: ${successCount} successful, ${errorCount} failed`);
    
    if (successCount > 0) {
      console.log(`✅ Successfully added ${successCount} recipients for notification ${notificationId}`);
    }
  },
  getUnreadForFarmer: async (farmerId) => {
    try {
      console.log(`🔍 Getting unread notifications for farmer ID: ${farmerId}`);
      const [rows] = await pool.execute(
        `SELECT n.*, nr.readAt, nr.id as recipient_id 
         FROM notifications n
         JOIN notification_recipients nr ON n.id = nr.notificationId
         WHERE nr.userId = ? AND nr.readAt IS NULL 
         ORDER BY n.createdAt DESC`,
        [farmerId]
      );
      console.log(`📨 Found ${rows.length} unread notifications for farmer ${farmerId}`);
      return rows;
    } catch (error) {
      console.error(`❌ Error getting unread notifications for farmer ${farmerId}:`, error.message);
      console.error('SQL Error details:', error);
      throw error;
    }
  },

  getAllForFarmer: async (farmerId) => {
    try {
      console.log(`🔍 Getting ALL notifications for farmer ID: ${farmerId}`);
      const [rows] = await pool.execute(
        `SELECT n.*, nr.readAt, nr.id as recipient_id,
         CASE WHEN nr.readAt IS NULL THEN 0 ELSE 1 END as is_read
         FROM notifications n
         JOIN notification_recipients nr ON n.id = nr.notificationId
         WHERE nr.userId = ? 
         ORDER BY n.createdAt DESC`,
        [farmerId]
      );
      console.log(`📨 Found ${rows.length} total notifications for farmer ${farmerId}`);
      return rows;
    } catch (error) {
      console.error(`❌ Error getting all notifications for farmer ${farmerId}:`, error.message);
      console.error('SQL Error details:', error);
      throw error;
    }
  },
  
  getUnreadCount: async (farmerId) => {
    try {
      console.log(`🔢 Getting unread count for farmer ID: ${farmerId}`);
      const [rows] = await pool.execute(
        `SELECT COUNT(*) as unread_count 
         FROM notification_recipients nr
         WHERE nr.userId = ? AND nr.readAt IS NULL`,
        [farmerId]
      );
      const count = rows[0].unread_count;
      console.log(`📊 Farmer ${farmerId} has ${count} unread notifications`);
      return count;
    } catch (error) {
      console.error(`❌ Error getting unread count for farmer ${farmerId}:`, error.message);
      throw error;
    }
  },
  
  markAsRead: async (notificationId, userId) => {
    try {
      console.log(`✅ Marking notification ${notificationId} as read for user ${userId}`);
      const [result] = await pool.execute(
        `UPDATE notification_recipients 
         SET readAt = NOW() 
         WHERE notificationId = ? AND userId = ? AND readAt IS NULL`,
        [notificationId, userId]
      );
      
      if (result.affectedRows > 0) {
        console.log(`✅ Successfully marked notification ${notificationId} as read for user ${userId}`);
        return true;
      } else {
        console.log(`ℹ️ Notification ${notificationId} was already read or doesn't exist for user ${userId}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error marking notification as read:`, error.message);
      throw error;
    }
  },
  
  markAllAsRead: async (userId) => {
    try {
      console.log(`✅ Marking all notifications as read for user ${userId}`);
      const [result] = await pool.execute(
        `UPDATE notification_recipients 
         SET readAt = NOW() 
         WHERE userId = ? AND readAt IS NULL`,
        [userId]
      );
      
      console.log(`✅ Marked ${result.affectedRows} notifications as read for user ${userId}`);
      return result.affectedRows;
    } catch (error) {
      console.error(`❌ Error marking all notifications as read:`, error.message);
      throw error;
    }
  }
};

module.exports = Notification;