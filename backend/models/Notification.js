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
  getForFarmer: async (farmerId) => {
    try {
      console.log(`🔍 Getting notifications for farmer ID: ${farmerId}`);
      const [rows] = await pool.execute(
        `SELECT n.* FROM notifications n
         JOIN notification_recipients nr ON n.id = nr.notificationId
         WHERE nr.userId = ? ORDER BY n.createdAt DESC`,
        [farmerId]
      );
      console.log(`📨 Found ${rows.length} notifications for farmer ${farmerId}`);
      return rows;
    } catch (error) {
      console.error(`❌ Error getting notifications for farmer ${farmerId}:`, error.message);
      console.error('SQL Error details:', error);
      throw error;
    }
  }
};

module.exports = Notification;