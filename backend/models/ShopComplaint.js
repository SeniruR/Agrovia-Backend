const { pool } = require('../config/database');

class ShopComplaint {
  // Create a new shop complaint
  static async create(complaint) {
    const {
      title,
      description,
      submittedBy,
      priority,
      shopName,
      location,
      category,
      orderNumber,
      purchaseDate,
      attachments
    } = complaint;

    // Ensure attachments is always a JSON stringified array
    let attachmentsStr = '[]';
    if (Array.isArray(attachments)) attachmentsStr = JSON.stringify(attachments);
    else if (attachments) attachmentsStr = JSON.stringify([attachments]);

    const query = `
      INSERT INTO shop_complaints
        (title, description, submitted_by, priority, shop_name, location, category, order_number, purchase_date, attachments, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    try {
      const [result] = await pool.execute(query, [
        title ?? null,
        description ?? null,
        submittedBy ?? null,
        priority ?? null,
        shopName ?? null,
        location ?? null,
        category ?? null,
        orderNumber ?? null,
        purchaseDate ? purchaseDate : null,
        attachmentsStr,
        new Date() // submitted_at as current timestamp
      ]);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Get all complaints
  static async findAll() {
    const query = 'SELECT * FROM shop_complaints ORDER BY submitted_at DESC';
    try {
      const [rows] = await pool.execute(query);
      // Parse attachments JSON for each row
      return rows.map(row => {
        let parsed = [];
        if (row.attachments) {
          try { parsed = JSON.parse(row.attachments); } catch { parsed = []; }
        }
        // If only one attachment, return as string under 'image'
        if (Array.isArray(parsed) && parsed.length === 1) {
          return {
            ...row,
            image: parsed[0],
          };
        } else if (Array.isArray(parsed) && parsed.length > 1) {
          return {
            ...row,
            images: parsed,
          };
        } else {
          return {
            ...row,
            image: null,
          };
        }
      });
    } catch (error) {
      throw error;
    }
  }

  // Get complaint by ID
  static async findById(id) {
    const query = 'SELECT * FROM shop_complaints WHERE id = ?';
    try {
      const [rows] = await pool.execute(query, [id]);
      if (!rows[0]) return null;
      
      // Create result object with base data
      let result = { ...rows[0] };
      
      // Debug the raw attachments data first
      if (rows[0].attachments) {
        console.log('Raw attachments data type:', typeof rows[0].attachments);
        if (Buffer.isBuffer(rows[0].attachments)) {
          console.log('Attachments is a Buffer, length:', rows[0].attachments.length);
        } else if (typeof rows[0].attachments === 'string') {
          console.log('Attachments is a String, length:', rows[0].attachments.length);
          console.log('First few characters:', rows[0].attachments.substring(0, 30));
        }
      }
      
      // Process attachments field if it exists
      if (rows[0].attachments) {
        try {
          // First try to parse as JSON (for cases when it's stored as a JSON string)
          const parsed = JSON.parse(rows[0].attachments); 
          console.log('Successfully parsed attachments as JSON');
          
          // If we have one attachment, put it in the image field
          if (Array.isArray(parsed) && parsed.length === 1) {
            result.image = parsed[0];
            console.log('Using single item from parsed JSON array');
          } else if (Array.isArray(parsed) && parsed.length > 1) {
            result.images = parsed;
            console.log('Using multiple items from parsed JSON array');
          }
        } catch (e) {
          // If JSON parsing fails, attachments might be a raw data string
          console.log('JSON parsing failed:', e.message);
          
          // For shop complaints, the attachment might be stored directly as base64
          if (typeof rows[0].attachments === 'string') {
            // Clean the string (remove any wrapping quotes, etc.)
            let cleanedData = rows[0].attachments.replace(/^["']+|["']+$/g, '');
            result.image = cleanedData;
            console.log('Using direct string data as image, length:', cleanedData.length);
          } else if (Buffer.isBuffer(rows[0].attachments)) {
            // It's a Buffer, convert to base64
            result.image = rows[0].attachments.toString('base64');
            console.log('Converted Buffer to base64 string, length:', result.image.length);
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error in ShopComplaint.findById:', error);
      throw error;
    }
  }

  // Update complaint
  static async update(id, data) {
    const fields = [];
    const values = [];
    for (const key in data) {
      if (key === 'attachments') {
        // ...existing code...
        if (typeof data[key] === 'string') {
          try {
            const parsed = JSON.parse(data[key]);
            values.push(data[key]);
          } catch {
            values.push(JSON.stringify([data[key]]));
          }
        } else if (Array.isArray(data[key])) {
          values.push(JSON.stringify(data[key]));
        } else if (data[key]) {
          values.push(JSON.stringify([data[key]]));
        } else {
          values.push('[]');
        }
        fields.push('attachments = ?');
      } else if (key === 'purchaseDate') {
        fields.push('purchase_date = ?');
        values.push(data[key]);
      } else {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    }
    const query = `UPDATE shop_complaints SET ${fields.join(', ')} WHERE id = ?`;
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
    const query = 'DELETE FROM shop_complaints WHERE id = ?';
    try {
      const [result] = await pool.execute(query, [id]);
      return result;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ShopComplaint;
