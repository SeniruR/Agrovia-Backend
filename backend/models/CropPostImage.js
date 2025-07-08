const { pool } = require('../config/database');

class CropPostImage {
  // Insert a new image for a crop post
  static async insert(post_id, imageBuffer) {
    const query = 'INSERT INTO crop_post_images (post_id, image) VALUES (?, ?)';
    const values = [post_id, imageBuffer];
    const [result] = await pool.execute(query, values);
    return result.insertId;
  }

  // Get all images for a crop post
  static async getByPostId(post_id) {
    const query = 'SELECT id, image FROM crop_post_images WHERE post_id = ?';
    const [rows] = await pool.execute(query, [post_id]);
    return rows;
  }
}

module.exports = CropPostImage;
