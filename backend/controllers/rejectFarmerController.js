const { pool } = require('../config/database');

// Reject a pending farmer (delete from users table, cascades to farmer_details, disable_accounts, etc.)
exports.rejectFarmer = async (req, res) => {
  const farmerId = req.params.id;
  if (!farmerId) {
    return res.status(400).json({ success: false, message: 'Missing farmer ID' });
  }
  try {
    // Delete user (cascades to farmer_details, disable_accounts, etc. if foreign keys are set)
    await pool.execute('DELETE FROM users WHERE id = ?', [farmerId]);
    return res.json({ success: true, message: 'Farmer application rejected and user deleted.' });
  } catch (err) {
    console.error('Error rejecting farmer:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject farmer', error: err.message });
  }
};
