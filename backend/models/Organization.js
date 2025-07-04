const { pool } = require('../config/database');

class Organization {
  // Create a new organization
  static async create(organizationData) {
    const { name, committee_number, district } = organizationData;

    const query = `
      INSERT INTO organizations (name, committee_number, district)
      VALUES (?, ?, ?)
    `;

    try {
      const [result] = await pool.execute(query, [name, committee_number, district]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Find organization by committee number
  static async findByCommitteeNumber(committee_number) {
    const query = 'SELECT * FROM organizations WHERE committee_number = ?';
    
    try {
      const [rows] = await pool.execute(query, [committee_number]);
      return rows[0];
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

  // Get all organizations
  static async findAll() {
    const query = 'SELECT * FROM organizations ORDER BY created_at DESC';
    
    try {
      const [rows] = await pool.query(query);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Update organization
  static async update(id, updateData) {
    const { name, district } = updateData;
    const query = 'UPDATE organizations SET name = ?, district = ? WHERE id = ?';
    
    try {
      const [result] = await pool.execute(query, [name, district, id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Delete organization
  static async delete(id) {
    const query = 'DELETE FROM organizations WHERE id = ?';
    
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Check if committee number exists
  static async exists(committee_number) {
    const query = 'SELECT COUNT(*) as count FROM organizations WHERE committee_number = ?';
    
    try {
      const [rows] = await pool.execute(query, [committee_number]);
      return rows[0].count > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Organization;
