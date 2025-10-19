const PestAlertModel = require('../models/pestAlert.model');
const { pool } = require('../config/database');
const Notification = require('../models/Notification');
const { notifyPremiumFarmers } = require('../socket');


exports.createPestAlert = async (req, res) => {
  try {
    const { pestName, symptoms, severity, recommendations, postedByUserId } = req.body;
    // Extract user ID from token (authenticated user is already verified by middleware)
    const userId = req.user?.id || postedByUserId;
    const userType = req.user?.user_type;
    
    console.log(`User attempting to create pest alert: ID=${userId}, Type=${userType}`);
    
    if (!userId || !pestName || !symptoms || !severity || !Array.isArray(recommendations)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // AUTHORIZATION: Only allow users with type 5.1 to create pest alerts
    if (userType !== '5.1') {
      console.log(`Access denied for user type: ${userType}. Only type 5.1 allowed.`);
      return res.status(403).json({ error: 'Only main moderators (type 5.1) can create pest alerts' });
    }
    
    console.log(`Creating pest alert for authorized user ${userId} (type ${userType})`);
    
    // Create the pest alert
    await PestAlertModel.createPestAlert(userId, pestName, symptoms, severity, recommendations);
    
    // Send notifications to farmers with type 1.1 (premium/organizer farmers)
    try {
      console.log('📋 Starting notification process...');
      
      // Find all farmers with type 1.1 and active status
      const [farmers] = await pool.execute(
        'SELECT id, full_name FROM users WHERE user_type = ? AND is_active = 1',
        ['1.1']
      );
      const farmerIds = farmers.map(f => f.id);

      console.log(`📊 Found ${farmers.length} farmers with type 1.1:`, farmers.map(f => `${f.id}:${f.full_name}`));

      if (farmerIds.length > 0) {
        console.log(`📤 Creating notification for ${farmerIds.length} farmers...`);
        
        // Create notification in notifications table
        const notificationId = await Notification.create(
          'New Pest Alert',
          `${pestName}: ${symptoms}. Severity: ${severity}`,
          'pest_alert'
        );

        console.log(`✅ Notification created with ID: ${notificationId}`);

        // Add recipients to notification_recipients table
        console.log(`📝 Adding recipients to notification_recipients table...`);
        await Notification.addRecipients(notificationId, farmerIds);

        console.log(`✅ Notification process completed successfully!`);

        // Real-time notify via socket (optional)
        try {
          if (typeof notifyPremiumFarmers === 'function') {
            notifyPremiumFarmers(
              { 
                id: notificationId, 
                title: 'New Pest Alert', 
                message: `${pestName}: ${symptoms}. Severity: ${severity}`, 
                type: 'pest_alert' 
              },
              farmerIds
            );
            console.log('🔔 Socket notification sent successfully');
          } else {
            console.warn('⚠️ Socket notification function not available');
          }
        } catch (socketError) {
          console.warn('⚠️ Socket notification failed (non-critical):', socketError.message);
        }
      } else {
        console.log('ℹ️ No farmers with type 1.1 found to notify');
      }
    } catch (notificationError) {
      console.error('❌ Failed to send notifications:', notificationError.message);
      console.error('Full error:', notificationError);
      // Don't fail the main request if notifications fail
    }
    
    res.status(201).json({ message: 'Pest alert created successfully and notifications sent' });
  } catch (err) {
    console.error('Error creating pest alert:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllPestAlerts = async (req, res) => {
  try {
    // Get all pest alerts with their recommendations and author information
    const [alerts] = await pool.execute(`
      SELECT pa.*,
             u.full_name as authorName,
             u.email as authorEmail,
             GROUP_CONCAT(pr.recommendation SEPARATOR '|||') as recommendations
      FROM PestAlerts pa
      LEFT JOIN PestRecommendations pr ON pa.id = pr.pestAlertId
      LEFT JOIN users u ON pa.moderatorId = u.id
      GROUP BY pa.id
      ORDER BY pa.createdAt DESC
    `);
    
    // Process recommendations to convert from string back to array
    const processedAlerts = alerts.map(alert => ({
      ...alert,
      recommendations: alert.recommendations ? alert.recommendations.split('|||') : [],
      // Add the userId for ownership checking (use moderatorId as postedByUserId)
      postedByUserId: alert.moderatorId
    }));
    
    res.json(processedAlerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePestAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userType = req.user?.type;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the pest alert exists
    const [alertCheck] = await pool.execute(
      'SELECT moderatorId FROM PestAlerts WHERE id = ?',
      [id]
    );

    if (alertCheck.length === 0) {
      return res.status(404).json({ error: 'Pest alert not found' });
    }

    // Check permissions: all users (including moderators) can only delete their own alerts
    const isOwner = alertCheck[0].moderatorId === userId;

    if (!isOwner) {
      return res.status(403).json({ error: 'You can only delete your own alerts' });
    }

    // Delete the pest alert (recommendations will be deleted automatically due to CASCADE)
    await pool.execute('DELETE FROM PestAlerts WHERE id = ?', [id]);
    
    res.json({ message: 'Pest alert deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


