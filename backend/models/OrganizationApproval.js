const { pool } = require('../config/database');

class Organization {
  // Get all organizations (any status)
  static async getAll() {
    const query = 'SELECT * FROM organizations';
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get all organizations with is_active = 1 (approved)
  static async getApproved() {
    const query = 'SELECT * FROM organizations WHERE is_active = 1';
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Get all organizations with is_active = -1 (rejected)
  static async getRejected() {
    const query = 'SELECT * FROM organizations WHERE is_active = -1';
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }
  // Get all organizations with is_active = 0 (pending)
  static async getPending() {
    const query = 'SELECT * FROM organizations WHERE is_active = 0';
    try {
      const [rows] = await pool.execute(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Approve organization (set is_active = 1)
  static async approve(id) {
    const query = 'UPDATE organizations SET is_active = 1 WHERE id = ?';
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Reject organization (set is_active = -1)
  static async reject(id) {
    const query = 'UPDATE organizations SET is_active = -1 WHERE id = ?';
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Find organization by ID
  static async findById(id) {
    const query = 'SELECT * FROM organizations WHERE id = ?';
    try {
      const [rows] = await pool.execute(query, [id]);
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Organization;
