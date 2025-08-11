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

  // Suspend organization (set is_active = 2)
  static async suspend(id) {
    const query = 'UPDATE organizations SET is_active = 2 WHERE id = ?';
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Fetch organizations by status
  static async getByStatus(status) {
    const query = 'SELECT * FROM organizations WHERE is_active = ?';
    try {
      const [rows] = await pool.execute(query, [status]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Fetch summary of organizations by status
  static async getSummaryByStatus(status) {
    const query = 'SELECT id, org_name, org_area, is_active FROM organizations WHERE is_active = ?';
    try {
      const [rows] = await pool.execute(query, [status]);
      return rows;
    } catch (error) {
      throw error;
    }
  }

  // Activate organization (set is_active = 1)
  static async activate(id) {
    const query = 'UPDATE organizations SET is_active = 1 WHERE id = ?';
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Remove organization and related data
  static async remove(id) {
    const deleteOrganizationQuery = 'DELETE FROM organizations WHERE id = ?';
    const deleteFarmersQuery = 'DELETE FROM farmer_details WHERE organization_id = ?';
    // Removed deletion of contact person as it will be handled with organization deletion

    try {
      // Start transaction
      await pool.query('START TRANSACTION');

      // Delete farmers
      await pool.execute(deleteFarmersQuery, [id]);

      // Delete organization
      const [result] = await pool.execute(deleteOrganizationQuery, [id]);

      // Commit transaction
      await pool.query('COMMIT');

      return result;
    } catch (error) {
      // Rollback transaction in case of error
      await pool.query('ROLLBACK');
      throw error;
    }
  }
}

module.exports = Organization;
