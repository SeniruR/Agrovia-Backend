const { pool } = require('../config/database');
const User = require('../models/User');

// Approve a pending farmer (set is_active=1 and remove from disable_accounts)
exports.approveFarmer = async (req, res) => {
  const farmerId = req.params.id;
  if (!farmerId) {
    return res.status(400).json({ success: false, message: 'Missing farmer ID' });
  }
  try {
    // Set is_active=1 for the user
    await User.updateActiveStatus(farmerId, 1);
    // Remove from disable_accounts (case_id=2)
    await pool.execute('DELETE FROM disable_accounts WHERE user_id = ? AND case_id = 2', [farmerId]);
    return res.json({ success: true, message: 'Farmer approved successfully.' });
  } catch (err) {
    console.error('Error approving farmer:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve farmer', error: err.message });
  }
};
