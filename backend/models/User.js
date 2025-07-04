const { pool } = require('../config/database');

class User {
  // Create a new user
  static async create(userData) {
    const {
      name,
      email,
      password,
      contact_number,
      district,
      land_size,
      nic_number,
      role,
      organization_committee_number,
      certificate_path
    } = userData;

    const query = `
      INSERT INTO users (
        name, email, password, contact_number, district, land_size, 
        nic_number, role, organization_committee_number, certificate_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      name,
      email,
      password,
      contact_number,
      district,
      land_size || null,
      nic_number,
      role,
      organization_committee_number || null,
      certificate_path || null
    ];

    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    
    try {
      const [rows] = await pool.execute(query, [email]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = ?';
    
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by NIC number
  static async findByNIC(nic_number) {
    const query = 'SELECT * FROM users WHERE nic_number = ?';
    
    try {
      const [rows] = await pool.execute(query, [nic_number]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update user verification status
  static async updateVerificationStatus(id, is_verified) {
    const query = 'UPDATE users SET is_verified = ? WHERE id = ?';
    
    try {
      const [result] = await pool.execute(query, [is_verified, id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all users with pagination
  static async findAll(limit = 50, offset = 0, role = null) {
    let query = 'SELECT id, name, email, contact_number, district, role, is_verified, is_active, created_at FROM users';
    let values = [];

    if (role) {
      query += ' WHERE role = ?';
      values.push(role);
    }

    query += ' ORDER BY created_at DESC';

    try {
      const [rows] = await pool.execute(query, values);
      return rows;
      return rows;
      return rows;
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Update user active status
  static async updateActiveStatus(id, is_active) {
    const query = 'UPDATE users SET is_active = ? WHERE id = ?';
    
    try {
      const [result] = await pool.execute(query, [is_active, id]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
