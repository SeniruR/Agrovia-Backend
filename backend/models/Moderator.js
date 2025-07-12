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
}

module.exports = { ModeratorSkillType, ModeratorSkillDemonstration };
