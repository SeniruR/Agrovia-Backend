const PestAlertModel = require('../models/pestAlert.model');
const { pool } = require('../config/database');

exports.createPestAlert = async (req, res) => {
  try {
    const { pestName, symptoms, severity, recommendations } = req.body;
    // Extract moderatorId from token (assuming req.user is set by auth middleware)
    const moderatorId = req.user?.id;
    if (!moderatorId || !pestName || !symptoms || !severity || !Array.isArray(recommendations)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    await PestAlertModel.createPestAlert(moderatorId, pestName, symptoms, severity, recommendations);
    res.status(201).json({ message: 'Pest alert created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllPestAlerts = async (req, res) => {
  try {
    // Get all pest alerts with their recommendations
    const [alerts] = await pool.execute(`
      SELECT pa.*, 
             GROUP_CONCAT(pr.recommendation SEPARATOR '|||') as recommendations
      FROM PestAlerts pa
      LEFT JOIN PestRecommendations pr ON pa.id = pr.pestAlertId
      GROUP BY pa.id
      ORDER BY pa.createdAt DESC
    `);
    
    // Process recommendations to convert from string back to array
    const processedAlerts = alerts.map(alert => ({
      ...alert,
      recommendations: alert.recommendations ? alert.recommendations.split('|||') : []
    }));
    
    res.json(processedAlerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePestAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const moderatorId = req.user?.id;

    if (!moderatorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if the pest alert exists and belongs to the user (optional security check)
    const [alertCheck] = await pool.execute(
      'SELECT moderatorId FROM PestAlerts WHERE id = ?',
      [id]
    );

    if (alertCheck.length === 0) {
      return res.status(404).json({ error: 'Pest alert not found' });
    }

    // Optional: Only allow the creator to delete their own alert
    if (alertCheck[0].moderatorId !== moderatorId) {
      return res.status(403).json({ error: 'You can only delete your own alerts' });
    }

    // Delete the pest alert (recommendations will be deleted automatically due to CASCADE)
    await pool.execute('DELETE FROM PestAlerts WHERE id = ?', [id]);
    
    res.json({ message: 'Pest alert deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};