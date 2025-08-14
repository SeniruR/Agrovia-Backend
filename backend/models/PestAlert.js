const { pool } = require('../config/database');

class PestAlert {
  static async create({ title, description, crop, symptoms, location, severity, reported_by }) {
    const query = `
      INSERT INTO pest_alerts (title, description, crop, symptoms, location, severity, reported_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(query, [title, description, crop, symptoms, location, severity, reported_by]);
    return result.insertId;
  }

  static async getAll() {
    const query = `SELECT * FROM pest_alerts ORDER BY created_at DESC`;
    const [rows] = await pool.query(query);
    return rows;
  }

  static async getById(id) {
    const query = `SELECT * FROM pest_alerts WHERE id = ?`;
    const [rows] = await pool.query(query, [id]);
    return rows[0];
  }

  static async update(id, { title, description, crop, symptoms, location, severity }) {
    const query = `
      UPDATE pest_alerts SET title = ?, description = ?, crop = ?, symptoms = ?, location = ?, severity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const [result] = await pool.query(query, [title, description, crop, symptoms, location, severity, id]);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const query = `DELETE FROM pest_alerts WHERE id = ?`;
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = PestAlert;
