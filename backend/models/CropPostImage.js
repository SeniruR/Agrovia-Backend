// models/CropPostImage.js
const { pool } = require('../config/database');

class CropPostImage {
  // Insert a new image for a crop post
  static async insert(postId, imageBuffer) {
    const query = 'INSERT INTO crop_post_images (post_id, image) VALUES (?, ?)';
    const [result] = await pool.execute(query, [postId, imageBuffer]);
    return result.insertId;
  }

  // Get all images for a crop post
  static async getByPostId(postId) {
    const query = 'SELECT id, image FROM crop_post_images WHERE post_id = ?';
    const [rows] = await pool.execute(query, [postId]);
    return rows;
  }

  // Delete an image by ID
  static async deleteById(imageId, postId) {
  const query = 'DELETE FROM crop_post_images WHERE id = ? AND post_id = ?';
  const [result] = await pool.execute(query, [imageId, postId]);
  return result.affectedRows > 0;
}
}

module.exports = CropPostImage;