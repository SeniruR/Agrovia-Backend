
const express = require('express');
const router = express.Router();
const { upload } = require('../config/upload');
const { registerTransporter, getAllTransporters } = require('../controllers/transporterController');
const { authLimiter } = require('../middleware/rateLimiter');
// You can add validation middleware if you create a Joi schema for transporter

// Suspend transporter: set is_active=0 and insert into disable_accounts
const { pool } = require('../config/database');
router.post('/suspend/:id', async (req, res) => {
  const userId = req.params.id;
  const caseId = 5; // as per requirements
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Set is_active=0
    const [updateResult] = await conn.query('UPDATE users SET is_active=0 WHERE id=?', [userId]);
    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    // Insert into disable_accounts
    await conn.query(
      'INSERT INTO disable_accounts (user_id, case_id, created_at) VALUES (?, ?, NOW())',
      [userId, caseId]
    );
    await conn.commit();
    res.json({ success: true, message: 'Account suspended.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Failed to suspend account.' });
  } finally {
    conn.release();
  }
});

router.post('/register/transporter',
  authLimiter,
  upload.single('profile_image'),
  registerTransporter
);




// GET /api/v1/transporters/accounts
// Get all transporter accounts
router.get('/accounts', async (req, res) => {
// Approve transporter: set is_active=1
router.post('/approve/:id', async (req, res) => {
  const userId = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Set is_active=1
    const [result] = await conn.query('UPDATE users SET is_active=1 WHERE id=?', [userId]);
    if (result.affectedRows === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    // Remove any disable_accounts rows for this user
    await conn.query('DELETE FROM disable_accounts WHERE user_id=?', [userId]);
    await conn.commit();
    res.json({ success: true, message: 'Transporter approved.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Failed to approve transporter.' });
  } finally {
    conn.release();
  }
});

// Reject transporter: delete from transporter_details and users
router.post('/reject/:id', async (req, res) => {
  const userId = req.params.id;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM transporter_details WHERE user_id=?', [userId]);
    await conn.query('DELETE FROM users WHERE id=?', [userId]);
    await conn.commit();
    res.json({ success: true, message: 'Transporter rejected and removed.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Failed to reject transporter.' });
  } finally {
    conn.release();
  }
});
  try {
    const [results] = await pool.query(`
      SELECT 
        u.id, u.full_name, u.email, u.phone_number, u.address, u.district, u.is_active,
        u.profile_image, u.profile_image_mime,
        t.vehicle_type, t.vehicle_number, t.vehicle_capacity, t.capacity_unit, t.license_number, t.license_expiry, t.additional_info
      FROM users u
      JOIN transporter_details t ON u.id = t.user_id
      WHERE u.user_type = 4
    `);
    // Convert profile_image (Buffer) to base64 data URL if present
    const processed = results.map(row => {
      if (row.profile_image) {
        row.profile_picture = `data:${row.profile_image_mime || 'image/jpeg'};base64,${row.profile_image.toString('base64')}`;
      } else {
        row.profile_picture = null;
      }
      delete row.profile_image;
      delete row.profile_image_mime;
      return row;
    });
    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transporter accounts' });
  }
});

router.get('/', getAllTransporters);

module.exports = router;
