const { pool } = require('../config/database');

class Transporter {
  // Create a new transporter details record
  static async create(transporterData) {
    const {
      user_id,
      vehicle_type,
      vehicle_number,
      vehicle_capacity,
      capacity_unit,
      license_number,
      license_expiry,
      additional_info
    } = transporterData;

    const query = `
      INSERT INTO transporter_details (
        user_id, vehicle_type, vehicle_number, vehicle_capacity, capacity_unit, license_number, license_expiry, additional_info
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      user_id,
      vehicle_type ?? null,
      vehicle_number ?? null,
      vehicle_capacity ?? null,
      capacity_unit ?? null,
      license_number ?? null,
      license_expiry ?? null,
      additional_info ?? null
    ];
    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Find transporter details by user_id
  static async findByUserId(user_id) {
    const query = 'SELECT * FROM transporter_details WHERE user_id = ?';
    try {
      const [rows] = await pool.execute(query, [user_id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all transporters
  static async getAll() {
    try {
      const [rows] = await pool.execute('SELECT * FROM transporter_details ORDER BY created_at DESC');
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Transporter;
