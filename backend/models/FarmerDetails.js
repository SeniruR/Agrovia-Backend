const { pool } = require('../config/database');


class FarmerDetails {
  static async findByUserId(user_id) {
    // Join with FarmerOrganization to get organization name
    const query = `
      SELECT fd.*, fo.org_name as organization_name
      FROM farmer_details fd
      LEFT JOIN organizations fo ON fd.organization_id = fo.id
      WHERE fd.user_id = ?
    `;
    try {
      const [rows] = await pool.execute(query, [user_id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByOrganizationId(organization_id) {
    const query = 'SELECT * FROM farmer_details WHERE organization_id = ?';
    try {
      const [rows] = await pool.execute(query, [organization_id]);
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = FarmerDetails;
