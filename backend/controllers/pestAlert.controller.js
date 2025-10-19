const PestAlertModel = require('../models/pestAlert.model');
const { pool } = require('../config/database');
const Notification = require('../models/Notification');
const { notifyPremiumFarmers } = require('../socket');


exports.createPestAlert = async (req, res) => {
  try {
    const { pestName, symptoms, severity, recommendations, postedByUserId } = req.body;
    // Extract user ID from token (can be any authenticated user)
    const userId = req.user?.id || postedByUserId;
    
    if (!userId || !pestName || !symptoms || !severity || !Array.isArray(recommendations)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    await PestAlertModel.createPestAlert(userId, pestName, symptoms, severity, recommendations);
    res.status(201).json({ message: 'Pest alert created successfully' });
  } catch (err) {
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


exports.createPestAlert = async (req, res) => {
  // Your existing pest alert creation logic
  // Assume pest alert is created and you have access to req.user (moderator/admin)
  const { title, description } = req.body;
  try {
    // Only moderators/admins can create pest alerts
    if (![5.1].includes(req.user.user_type)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create pest alert (use your existing model)
    // const pestAlertId = await PestAlert.create(...);

    // Find all premium farmers
    const [farmers] = await db.query(
      'SELECT id FROM users WHERE user_type = 1.1 AND premium = true'
    );
    const farmerIds = farmers.map(f => f.id);

    // Create notification
    const notificationId = await Notification.create(
      'New Pest Alert',
      description,
      'pest_alert'
    );

    // Add recipients
    await Notification.addRecipients(notificationId, farmerIds);

    // Real-time notify via socket
    notifyPremiumFarmers(
      { id: notificationId, title: 'New Pest Alert', message: description, type: 'pest_alert' },
      farmerIds
    );

    res.status(201).json({ message: 'Pest alert and notifications sent.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create pest alert/notification.' });
  }
};