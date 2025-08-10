const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// GET /api/v1/moderators/accounts - get all moderator accounts (for admin approval UI)
// GET /api/v1/moderators/accounts - get all moderator accounts (for admin approval UI)
router.get('/accounts', async (req, res) => {
  try {
    // Get all moderators (user_type = '5' or '5.1')
    const [rows] = await pool.execute(
      `SELECT id, full_name, email, phone_number, district, nic, address, user_type, is_active, created_at, profile_image, profile_image_mime
       FROM users WHERE user_type = '5' OR user_type = '5.1' ORDER BY created_at DESC`
    );

    // For each moderator, fetch their skills
    // Helper to map user_type to label
    const userTypeLabel = (type) => {
      if (type === '4') return 'Logistics Provider';
      if (type === '5' || type === '5.1') return 'Moderator';
      return '-';
    };

    // Helper to format date
    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d)) return '-';
      return d.toLocaleString('en-GB', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    const moderators = await Promise.all(rows.map(async (row) => {
      let profile_picture = null;
      if (row.profile_image) {
        const mime = row.profile_image_mime || 'image/jpeg';
        profile_picture = `data:${mime};base64,${row.profile_image.toString('base64')}`;
      }

      // Fetch skills for this moderator
      const [skills] = await pool.execute(
        `SELECT mst.type_name, msd.data AS description, msd.created_at
         FROM moderator_skill_demonstrations msd
         JOIN moderator_skill_types mst ON msd.data_type_id = mst.id
         WHERE msd.user_id = ?
         ORDER BY msd.created_at DESC`,
        [row.id]
      );

      return {
        id: row.id,
        full_name: row.full_name,
        email: row.email,
        phone_number: row.phone_number,
        district: row.district,
        nic: row.nic,
        address: row.address,
        user_type: userTypeLabel(row.user_type),
        is_active: row.is_active,
        created_at: formatDate(row.created_at),
        profile_picture,
        skills: skills.map(skill => {
          if (skill.type_name === 'url') {
            return {
              type_name: skill.type_name,
              url: skill.description,
              description: '',
              worker_id: '',
              created_at: formatDate(skill.created_at)
            };
          } else if (skill.type_name === 'description') {
            return {
              type_name: skill.type_name,
              description: skill.description,
              url: '',
              worker_id: '',
              created_at: formatDate(skill.created_at)
            };
          } else if (skill.type_name === 'worker_id') {
            return {
              type_name: skill.type_name,
              worker_id: skill.description,
              description: '',
              url: '',
              created_at: formatDate(skill.created_at)
            };
          } else {
            return {
              type_name: skill.type_name,
              description: skill.description,
              url: '',
              worker_id: '',
              created_at: formatDate(skill.created_at)
            };
          }
        })
      };
    }));
    res.json(moderators);
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
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Approve moderator
      const [result] = await conn.query('UPDATE users SET is_active = 1 WHERE id = ? AND (user_type = ? OR user_type = ?)', [id, '5', '5.1']);
      if (result.affectedRows === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ success: false, message: 'Moderator not found' });
      }
      // Remove any disable_accounts rows for this user
      await conn.query('DELETE FROM disable_accounts WHERE user_id = ?', [id]);
      await conn.commit();
      res.json({ success: true, message: 'Moderator approved' });
    } catch (err) {
      await conn.rollback();
      console.error('Failed to approve moderator:', err);
      res.status(500).json({ success: false, message: 'Failed to approve moderator' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Failed to approve moderator (outer):', err);
    res.status(500).json({ success: false, message: 'Failed to approve moderator' });
  }
});

// Suspend moderator (set is_active = 0)
router.post('/suspend/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Start transaction
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Set is_active = 0
      const [result] = await conn.query('UPDATE users SET is_active = 0 WHERE id = ? AND (user_type = ? OR user_type = ?)', [id, '5', '5.1']);
      if (result.affectedRows === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ success: false, message: 'Moderator not found' });
      }
      // Insert into disable_accounts
      await conn.query('INSERT INTO disable_accounts (user_id, case_id, created_at) VALUES (?, ?, NOW())', [id, 5]);
      await conn.commit();
      res.json({ success: true, message: 'Moderator suspended' });
    } catch (err) {
      await conn.rollback();
      console.error('Failed to suspend moderator:', err);
      res.status(500).json({ success: false, message: 'Failed to suspend moderator' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Failed to suspend moderator (outer):', err);
    res.status(500).json({ success: false, message: 'Failed to suspend moderator' });
  }
});

// Reject moderator (delete account)
router.post('/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Remove any disable_accounts rows for this user
      await conn.query('DELETE FROM disable_accounts WHERE user_id = ?', [id]);
      // Delete user
      const [result] = await conn.query('DELETE FROM users WHERE id = ? AND (user_type = ? OR user_type = ?)', [id, '5', '5.1']);
      if (result.affectedRows === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({ success: false, message: 'Moderator not found' });
      }
      await conn.commit();
      res.json({ success: true, message: 'Moderator rejected and deleted' });
    } catch (err) {
      await conn.rollback();
      console.error('Failed to reject moderator:', err);
      res.status(500).json({ success: false, message: 'Failed to reject moderator' });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('Failed to reject moderator (outer):', err);
    res.status(500).json({ success: false, message: 'Failed to reject moderator' });
  }
});
