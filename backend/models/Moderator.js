const { pool } = require('../config/database');

class ModeratorSkillType {
  // Get skill type id by name, or insert if not exists
  static async getOrCreateType(typeName) {
    const [rows] = await pool.execute('SELECT id FROM moderator_skill_types WHERE type_name = ?', [typeName]);
    if (rows.length > 0) return rows[0].id;
    const [result] = await pool.execute('INSERT INTO moderator_skill_types (type_name) VALUES (?)', [typeName]);
    return result.insertId;
  }
}

class ModeratorSkillDemonstration {
  // Insert a skill demonstration row
  static async insert({ user_id, data_type_id, data }) {
    await pool.execute(
      'INSERT INTO moderator_skill_demonstrations (user_id, data_type_id, data, created_at) VALUES (?, ?, ?, NOW())',
      [user_id, data_type_id, data]
    );
  }

  // Get all skill demonstrations for a user
  static async getByUserId(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM moderator_skill_demonstrations WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  }

  // Delete all skill demonstrations for a user
  static async deleteByUserId(userId) {
    await pool.execute(
      'DELETE FROM moderator_skill_demonstrations WHERE user_id = ?',
      [userId]
    );
  }

  // Update skill demonstrations for a user (replace all)
  static async updateByUserId(userId, demonstrations) {
    // Delete existing demonstrations
    await this.deleteByUserId(userId);
    
    // Insert new demonstrations
    for (const demo of demonstrations) {
      await this.insert({
        user_id: userId,
        data_type_id: demo.data_type_id,
        data: demo.data
      });
    }
  }
}

module.exports = { ModeratorSkillType, ModeratorSkillDemonstration };
