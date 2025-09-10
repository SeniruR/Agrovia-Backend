
const { pool } = require('../config/database');

// Optional dev logger (opt-in via DEBUG_ATTACHMENT_LOGS)
const devLog = (...args) => {
  if (process.env.DEBUG_ATTACHMENT_LOGS === 'true') console.log(...args);
};

class CropComplaint {
  // Create a new crop complaint
  static async create(complaint) {
    const {
      title,
      description,
      submittedBy,
      priority,
      cropType,
      to_farmer,
      category,
      orderNumber,
      attachments = null // images as BLOB
    } = complaint;

  // Debug: Log the complaint data (opt-in)
  devLog('Model received complaint:', complaint);
  devLog('Model to_farmer value:', to_farmer);
  devLog('Model to_farmer type:', typeof to_farmer);

    // Ensure attachments is always a JSON stringified array
    let attachmentsStr = '[]';
    if (Array.isArray(attachments)) attachmentsStr = JSON.stringify(attachments);
    else if (attachments) attachmentsStr = JSON.stringify([attachments]);

    const query = `
      INSERT INTO crop_complaints
        (title, description, submitted_by, priority, crop_type, to_farmer, category, order_number, attachments, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      title ?? null,
      description ?? null,
      submittedBy ?? null,
      priority ?? null,
      cropType ?? null,
      to_farmer ?? null,
      category ?? null,
      orderNumber ?? null,
      attachmentsStr,
      new Date() // submitted_at as current timestamp
    ];
    
  // Debug: Log the values being inserted (opt-in)
  devLog('Inserting values:', values);
  devLog('to_farmer value being inserted:', values[5]);
    
    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all complaints
  static async findAll() {
    const query = 'SELECT * FROM crop_complaints ORDER BY submitted_at DESC';
    try {
      const [rows] = await pool.execute(query);
      // Parse attachments JSON for each row
      return rows.map(row => {
        let parsed = [];
        if (row.attachments) {
          try { parsed = JSON.parse(row.attachments); } catch { parsed = []; }
        }
        // If only one attachment, return as string
        return {
          ...row,
          attachments: Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed,
        };
      });
    } catch (error) {
      throw error;
    }
  }

  // Get complaint by ID
  static async findById(id) {
    // Include submitter and farmer names
    const query = `
      SELECT cc.*, u.full_name AS submittedByName, uf.full_name AS farmerName
      FROM crop_complaints cc
      LEFT JOIN users u ON cc.submitted_by = u.id
      LEFT JOIN users uf ON cc.to_farmer = uf.id
      WHERE cc.id = ?
    `;
    try {
      const [rows] = await pool.execute(query, [id]);
      if (!rows[0]) return null;
      let parsed = [];
      if (rows[0].attachments) {
        try { parsed = JSON.parse(rows[0].attachments); } catch { parsed = []; }
      }
      return {
        ...rows[0],
        attachments: Array.isArray(parsed) && parsed.length === 1 ? parsed[0] : parsed,
      };
    } catch (error) {
      throw error;
    }
  }

  // Update complaint
  static async update(id, data) {
    const fields = [];
    const values = [];
    for (const key in data) {
      if (key === 'attachments') {
        // Always store as JSON string
        if (Array.isArray(data[key])) values.push(JSON.stringify(data[key]));
        else if (data[key]) values.push(JSON.stringify([data[key]]));
        else values.push('[]');
        fields.push('attachments = ?');
      } else {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    const query = `UPDATE crop_complaints SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    try {
      const [result] = await pool.execute(query, values);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Delete complaint
  static async delete(id) {
    const query = 'DELETE FROM crop_complaints WHERE id = ?';
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CropComplaint;
