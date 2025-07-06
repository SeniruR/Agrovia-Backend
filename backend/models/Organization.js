const { pool } = require('../config/database');

class Organization {
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
  // Create a new organization (new fields)
  static async create(org) {
    const {
      org_name,
      org_area,
      gn_name,
      gn_contact,
      letter_of_proof,
      established_date,
      org_description,
      contactperson_id
    } = org;

    const query = `
      INSERT INTO organizations
        (org_name, org_area, gn_name, gn_contact, letter_of_proof, established_date, org_description, contactperson_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await pool.execute(query, [
        org_name,
        org_area,
        gn_name,
        gn_contact,
        letter_of_proof,
        established_date,
        org_description,
        contactperson_id
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Search organizations by name (for autocomplete)
  static async searchByName(name) {
    // Only show organizations where is_active = 1
    const query = `
      SELECT o.id, o.org_name, o.org_area, u.full_name AS contactperson_name
      FROM organizations o
      LEFT JOIN users u ON o.org_contactperson_id = u.id
      WHERE o.org_name LIKE ? AND o.is_active = 1
      ORDER BY o.org_name ASC
      LIMIT 10
    `;
    try {
      const [rows] = await pool.execute(query, [`%${name}%`]);
      return rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Organization;
