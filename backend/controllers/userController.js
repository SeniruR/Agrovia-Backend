const { pool } = require('../config/database');

class UserController {
  // Get user profile
  static async getUserProfile(req, res) {
    try {
      console.log('📋 Get user profile request received');
      
      // For testing, use a default user ID or get from headers
      const userId = req.headers['x-user-id'] || req.user?.id || 1;
      
      const query = `
        SELECT id, full_name, email, phone_number, district, nic, address, 
               profile_image, user_type, created_at
        FROM users 
        WHERE id = ?
      `;

      const [rows] = await pool.execute(query, [userId]);
      
      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = rows[0];

      res.json({
        success: true,
        message: 'User profile retrieved successfully',
        data: user
      });
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Get user's crop posting history for suggestions
  static async getUserCropHistory(req, res) {
    try {
      console.log('📋 Get user crop history request received');
      
      const userId = req.headers['x-user-id'] || req.user?.id || 1;
      
      const query = `
        SELECT DISTINCT crop_name, crop_category, variety, unit, district, location
        FROM crop_posts 
        WHERE farmer_id = ? 
        ORDER BY created_at DESC 
        LIMIT 10
      `;

      const [rows] = await pool.execute(query, [userId]);

      res.json({
        success: true,
        message: 'User crop history retrieved successfully',
        data: rows
      });
    } catch (error) {
      console.error('❌ Get user crop history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve crop history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  // Update user profile
  static async updateUserProfile(req, res) {
    try {
      console.log('📝 Update user profile request received');
      
      const userId = req.headers['x-user-id'] || req.user?.id || 1;
      const { full_name, email, phone_number, district, address } = req.body;

      const query = `
        UPDATE users 
        SET full_name = ?, email = ?, phone_number = ?, district = ?, address = ?, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const [result] = await pool.execute(query, [
        full_name, email, phone_number, district, address, userId
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User profile updated successfully'
      });
    } catch (error) {
      console.error('❌ Update user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = UserController;
