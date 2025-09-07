const { pool } = require('../config/database');

class PestAlert {
  static async create({ title, description, crop, symptoms, location, severity, reported_by }) {
    const query = `
      INSERT INTO pest_alerts (
        title, description, crop, symptoms, location, severity, status,
        pest_type, affected_area, estimated_loss, treatment_applied,
        recommendations, images, weather_conditions, reported_by,
        contact_phone, contact_email, follow_up_date, tags, latitude, longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [
      title, description, crop, symptoms, location, severity, status,
      pest_type, affected_area, estimated_loss, treatment_applied,
      recommendations,
      images ? JSON.stringify(images) : null,
      weather_conditions ? JSON.stringify(weather_conditions) : null,
      reported_by, contact_phone, contact_email, follow_up_date,
      tags ? JSON.stringify(tags) : null,
      latitude, longitude
    ];
    const [result] = await pool.query(query, values);
    return result.insertId;
  }

  static async getAll() {
    const query = `SELECT * FROM pest_alerts ORDER BY created_at DESC`;
  const [rows] = await pool.query(query, values);
    return rows;
  }

  static async getById(id) {
    const query = `SELECT * FROM pest_alerts WHERE id = ?`;
  const [rows] = await pool.query(query, [id]);
    return rows[0];
  }

  static async update(id, { title, description, crop, symptoms, location, severity }) {
    const query = `
      UPDATE pest_alerts SET 
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        crop = COALESCE(?, crop),
        symptoms = COALESCE(?, symptoms),
        location = COALESCE(?, location),
        severity = COALESCE(?, severity),
        status = COALESCE(?, status),
        pest_type = COALESCE(?, pest_type),
        affected_area = COALESCE(?, affected_area),
        estimated_loss = COALESCE(?, estimated_loss),
        treatment_applied = COALESCE(?, treatment_applied),
        recommendations = COALESCE(?, recommendations),
        images = COALESCE(?, images),
        weather_conditions = COALESCE(?, weather_conditions),
        contact_phone = COALESCE(?, contact_phone),
        contact_email = COALESCE(?, contact_email),
        follow_up_date = COALESCE(?, follow_up_date),
        tags = COALESCE(?, tags),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const values = [
      title, description, crop, symptoms, location, severity, id
    ];
    const [result] = await pool.query(query, values);
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const query = `DELETE FROM pest_alerts WHERE id = ?`;
    const [result] = await pool.query(query, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = PestAlert;
