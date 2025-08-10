const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/v1/moderators/accounts - get all moderator accounts (for admin approval UI)
router.get('/accounts', async (req, res) => {
  try {
    // user_type = 'moderator' or whatever value you use for moderators
    const [rows] = await pool.execute(
      `SELECT id, full_name, email, phone_number, district, is_active, created_at, profile_image, profile_image_mime
       FROM users WHERE user_type = '5' OR user_type = '5.1' ORDER BY created_at DESC`
    );
    // Convert image to base64 if present
    const data = rows.map(row => {
      let profile_picture = null;
      if (row.profile_image) {
        const mime = row.profile_image_mime || 'image/jpeg';
        profile_picture = `data:${mime};base64,${row.profile_image.toString('base64')}`;
      }
      return {
        ...row,
        profile_picture
      };
    });
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch moderators:', err);
    res.status(500).json({ error: 'Failed to fetch moderators' });
  }
});

module.exports = router;
// Approve moderator (set is_active = 1)
router.post('/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute('UPDATE users SET is_active = 1 WHERE id = ? AND (user_type = ? OR user_type = ?)', [id, '5', '5.1']);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Moderator not found' });
    }
    res.json({ success: true, message: 'Moderator approved' });
  } catch (err) {
    console.error('Failed to approve moderator:', err);
    res.status(500).json({ success: false, message: 'Failed to approve moderator' });
  }
});

// Suspend moderator (set is_active = 0)
router.post('/suspend/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute('UPDATE users SET is_active = 0 WHERE id = ? AND (user_type = ? OR user_type = ?)', [id, '5', '5.1']);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Moderator not found' });
    }
    res.json({ success: true, message: 'Moderator suspended' });
  } catch (err) {
    console.error('Failed to suspend moderator:', err);
    res.status(500).json({ success: false, message: 'Failed to suspend moderator' });
  }
});

// Reject moderator (delete account)
router.post('/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute('DELETE FROM users WHERE id = ? AND (user_type = ? OR user_type = ?)', [id, '5', '5.1']);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Moderator not found' });
    }
    res.json({ success: true, message: 'Moderator rejected and deleted' });
  } catch (err) {
    console.error('Failed to reject moderator:', err);
    res.status(500).json({ success: false, message: 'Failed to reject moderator' });
  }
});
