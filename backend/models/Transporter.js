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
      additional_info,
      base_rate,
      per_km_rate
    } = transporterData;

    const query = `
      INSERT INTO transporter_details (
        user_id, vehicle_type, vehicle_number, vehicle_capacity, capacity_unit, license_number, license_expiry, additional_info, base_rate, per_km_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      user_id,
      vehicle_type ?? null,
      vehicle_number ?? null,
      vehicle_capacity ?? null,
      capacity_unit ?? null,
      license_number ?? null,
      license_expiry ?? null,
      additional_info ?? null,
      base_rate ?? null,
      per_km_rate ?? null
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

  static async findById(id) {
    if (!id) return null;
    const query = `
      SELECT 
        td.id,
        td.user_id,
        td.vehicle_type,
        td.vehicle_number,
        td.vehicle_capacity,
        td.capacity_unit,
        td.license_number,
        td.license_expiry,
        td.additional_info,
        td.created_at AS transport_created_at,
        td.base_rate,
        td.base_rate AS baseRate,
        td.per_km_rate,
        td.per_km_rate AS perKmRate,
        u.full_name,
        u.email,
        u.phone_number AS phone_number,
        u.phone_number AS phone_no,
        u.address,
        u.district,
        u.nic,
        u.is_active,
        u.profile_image,
        u.profile_image_mime,
        u.user_type,
        u.created_at AS user_created_at
      FROM transporter_details td
      JOIN users u ON u.id = td.user_id
      WHERE td.id = ?
      LIMIT 1
    `;
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Update transporter details by user_id
  static async updateByUserId(user_id, transporterData) {
    const fields = [];
    const values = [];
    
    // Build dynamic query based on provided fields
    Object.keys(transporterData).forEach(key => {
      if (transporterData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(transporterData[key]);
      }
    });

    if (fields.length === 0) {
      return { affectedRows: 0 };
    }

    values.push(user_id);
    const query = `UPDATE transporter_details SET ${fields.join(', ')} WHERE user_id = ?`;
    
    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all transporters
  static async getAll() {
    try {
      const [rows] = await pool.execute(`
        SELECT 
          td.id,
          td.user_id,
          td.vehicle_type,
          td.vehicle_number,
          td.vehicle_capacity,
          td.capacity_unit,
          td.license_number,
          td.license_expiry,
          td.additional_info,
          td.created_at AS transport_created_at,
          td.base_rate,
          td.base_rate AS baseRate,
          td.per_km_rate,
          td.per_km_rate AS perKmRate,
          u.full_name,
          u.email,
          u.phone_number AS phone_number,
          u.phone_number AS phone_no,
          u.address,
          u.district,
          u.nic,
          u.is_active,
          u.profile_image,
          u.profile_image_mime,
          u.user_type,
          u.created_at AS user_created_at
        FROM transporter_details td
        JOIN users u ON u.id = td.user_id
        ORDER BY td.created_at DESC
      `);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  static async updatePricing(transporterId, pricing = {}) {
    const fields = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(pricing, 'base_rate')) {
      fields.push('base_rate = ?');
      values.push(pricing.base_rate);
    }

    if (Object.prototype.hasOwnProperty.call(pricing, 'per_km_rate')) {
      fields.push('per_km_rate = ?');
      values.push(pricing.per_km_rate);
    }

    if (fields.length === 0) {
      return { affectedRows: 0 };
    }

    values.push(transporterId);
    const query = `UPDATE transporter_details SET ${fields.join(', ')} WHERE id = ?`;

    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Transporter;
