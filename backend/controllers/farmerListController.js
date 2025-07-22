const { pool } = require('../config/database');

// Get all farmers for an organization if user is an org contact person, else just their own farmer record
exports.getAllFarmers = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId parameter' });
    }

    // Check if user is an organization contact person
    const [orgRows] = await pool.execute(
      'SELECT * FROM organizations WHERE org_contactperson_id = ?',
      [userId]
    );

    if (orgRows.length > 0) {
      // User is a contact person, get ALL farmers for this organization (pending and approved)
      const orgId = orgRows[0].id;
      const [rows] = await pool.execute(`
        SELECT 
          u.id, u.full_name, u.email, u.phone_number, u.district, u.nic, u.address, u.profile_image, u.user_type, u.created_at, u.is_active,
          f.land_size, f.description, f.division_gramasewa_number, f.farming_experience, f.cultivated_crops, f.irrigation_system, f.soil_type, f.farming_certifications, f.organization_id,
          o.org_name, o.id as organization_id, o.org_area, o.org_description, o.org_contactperson_id, o.gn_name, o.gn_contactno, o.est,
          CASE 
            WHEN u.is_active = 0 AND u.id IN (SELECT user_id FROM disable_accounts WHERE case_id = 2) THEN 'pending'
            WHEN u.is_active = 1 THEN 'approved'
            ELSE 'other'
          END as status
        FROM users u
        JOIN farmer_details f ON u.id = f.user_id
        LEFT JOIN organizations o ON f.organization_id = o.id
        WHERE (u.user_type = 1 OR u.user_type = 1.1 OR u.user_type = '1.1')
          AND f.organization_id = ?
        ORDER BY u.created_at DESC
      `, [orgId]);
      return res.json(rows);
    } else {
      // Not a contact person, just return their own farmer record if exists
      const [rows] = await pool.execute(`
        SELECT 
          u.id, u.full_name, u.email, u.phone_number, u.district, u.nic, u.address, u.profile_image, u.user_type, u.created_at, u.is_active,
          f.land_size, f.description, f.division_gramasewa_number, f.farming_experience, f.cultivated_crops, f.irrigation_system, f.soil_type, f.farming_certifications, f.organization_id,
          o.org_name, o.id as organization_id, o.org_area, o.org_description, o.org_contactperson_id, o.gn_name, o.gn_contactno, o.est
        FROM users u
        JOIN farmer_details f ON u.id = f.user_id
        LEFT JOIN organizations o ON f.organization_id = o.id
        WHERE (u.user_type = 1 OR u.user_type = 1.1 OR u.user_type = '1.1') AND u.id = ?
        ORDER BY u.created_at DESC
      `, [userId]);
      return res.json(rows);
    }
  } catch (err) {
    console.error('Error fetching farmers:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch farmers', error: err.message });
  }
};
