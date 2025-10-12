const { pool } = require('../config/database');

class Buyer {
  // Create a new buyer details record
  static async create(buyerData) {
    const {
      user_id,
      company_name,
      company_type,
      company_address,
      payment_offer,
      company_latitude,
      company_longitude
    } = buyerData;

    const query = `
      INSERT INTO buyer_details (
        user_id, company_name, company_type, company_address, payment_offer, latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      user_id,
      company_name ?? null,
      company_type ?? null,
      company_address ?? null,
      payment_offer ?? null,
      company_latitude ?? null,
      company_longitude ?? null
    ];
    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Find buyer details by user_id
  static async findByUserId(user_id) {
    const query = 'SELECT * FROM buyer_details WHERE user_id = ?';
    try {
      const [rows] = await pool.execute(query, [user_id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Buyer;
