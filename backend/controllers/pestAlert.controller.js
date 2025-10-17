const PestAlertModel = require('../models/pestAlert.model');

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
