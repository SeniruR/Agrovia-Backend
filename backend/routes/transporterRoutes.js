const express = require('express');
const router = express.Router();
const { upload } = require('../config/upload');
const { registerTransporter, getAllTransporters } = require('../controllers/transporterController');
const { authLimiter } = require('../middleware/rateLimiter');
// You can add validation middleware if you create a Joi schema for transporter
const { pool } = require('../config/database');

// Approve/reject/suspend transporter: set is_active=1 and remove from disable_accounts, then send approval/rejection/suspension email
const { sendLogisticsApprovalEmail, sendLogisticsRejectionEmail, sendLogisticsSuspensionEmail } = require('../utils/notify');
// Reject transporter: delete user and send rejection email
router.post('/reject/:id', async (req, res) => {
  const userId = req.params.id;
  const { message } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Fetch user email and name before deleting
    const [userRows] = await conn.query('SELECT email, full_name FROM users WHERE id=?', [userId]);
    // Delete user
    const [result] = await conn.query('DELETE FROM users WHERE id=?', [userId]);
    // Remove any disable_accounts rows for this user
    await conn.query('DELETE FROM disable_accounts WHERE user_id=?', [userId]);
    await conn.commit();
    if (userRows && userRows[0] && userRows[0].email) {
      try {
        await sendLogisticsRejectionEmail(userRows[0].email, userRows[0].full_name, message);
      } catch (mailErr) {
        // Log but don't block rejection if email fails
        console.error('Failed to send rejection email:', mailErr);
      }
    }
    res.json({ success: true, message: 'Transporter rejected and deleted.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Failed to reject transporter.' });
  } finally {
    conn.release();
  }
});
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

    // Fetch user email and name
    const [userRows] = await conn.query('SELECT email, full_name FROM users WHERE id=?', [userId]);
    if (userRows && userRows[0] && userRows[0].email) {
      try {
        await sendLogisticsApprovalEmail(userRows[0].email, userRows[0].full_name);
      } catch (mailErr) {
        // Log but don't block approval if email fails
        console.error('Failed to send approval email:', mailErr);
      }
    }

    res.json({ success: true, message: 'Transporter approved.' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: 'Failed to approve transporter.' });
  } finally {
    conn.release();
  }
});
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

    // Fetch user email and name
    const [userRows] = await conn.query('SELECT email, full_name FROM users WHERE id=?', [userId]);
    if (userRows && userRows[0] && userRows[0].email) {
      try {
        await sendLogisticsSuspensionEmail(userRows[0].email, userRows[0].full_name);
      } catch (mailErr) {
        // Log but don't block suspension if email fails
        console.error('Failed to send suspension email:', mailErr);
      }
    }

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
  try {
    // Get all transporter accounts and their disable_accounts case_id (if any)
    const [results] = await pool.query(`
      SELECT 
        u.id, u.full_name, u.email, u.phone_number, u.address, u.district, u.nic, u.is_active,
        u.profile_image, u.profile_image_mime,
        t.vehicle_type, t.vehicle_number, t.vehicle_capacity, t.capacity_unit, t.license_number, t.license_expiry, t.additional_info,
        u.user_type, u.created_at,
        da.case_id AS disable_case_id
      FROM users u
      JOIN transporter_details t ON u.id = t.user_id
      LEFT JOIN disable_accounts da ON u.id = da.user_id
      WHERE u.user_type = 4
    `);

    // Helper to map user_type to label
    const userTypeLabel = (type) => {
      if (type === 4 || type === '4') return 'Logistics Provider';
      return '-';
    };

    // Helper to format date
    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d)) return '-';
      return d.toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const processed = results.map(row => {
      let profile_picture = null;
      if (row.profile_image) {
        profile_picture = `data:${row.profile_image_mime || 'image/jpeg'};base64,${row.profile_image.toString('base64')}`;
      }
      return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        phone_number: row.phone_number,
        address: row.address,
        district: row.district,
        nic: row.nic,
        is_active: row.is_active,
        vehicle_type: row.vehicle_type,
        vehicle_number: row.vehicle_number,
        vehicle_capacity: row.vehicle_capacity,
        capacity_unit: row.capacity_unit,
        license_number: row.license_number,
        license_expiry: formatDate(row.license_expiry),
        additional_info: row.additional_info,
        profile_picture,
        user_type: userTypeLabel(row.user_type),
        created_at: formatDate(row.created_at),
        disable_case_id: row.disable_case_id // may be null
      };
    });
    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transporter accounts' });
  }
});

router.get('/', getAllTransporters);

module.exports = router;
