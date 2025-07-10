const { pool } = require('../config/database');

class FarmerDetails {
  static async findByUserId(user_id) {
    const query = 'SELECT * FROM farmer_details WHERE user_id = ?';
    try {
      const [rows] = await pool.execute(query, [user_id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = FarmerDetails;
