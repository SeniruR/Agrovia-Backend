const { pool } = require('../config/database');

class PasswordResetToken {
  static async invalidateExisting(userId) {
    const query = `UPDATE password_reset_tokens SET used = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used = 0`;
    await pool.execute(query, [userId]);
  }

  static async create(userId, codeHash, expiresAt) {
    const query = `
      INSERT INTO password_reset_tokens (user_id, code_hash, expires_at)
      VALUES (?, ?, ?)
    `;
    const [result] = await pool.execute(query, [userId, codeHash, expiresAt]);
    return { id: result.insertId };
  }

  static async findActiveByUserId(userId) {
    const query = `
      SELECT *
        FROM password_reset_tokens
       WHERE user_id = ?
         AND used = 0
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows[0] || null;
  }

  static async findActiveVerifiedByUserId(userId) {
    const query = `
      SELECT *
        FROM password_reset_tokens
       WHERE user_id = ?
         AND used = 0
         AND reset_session_hash IS NOT NULL
         AND expires_at > NOW()
       ORDER BY updated_at DESC
       LIMIT 1
    `;
    const [rows] = await pool.execute(query, [userId]);
    return rows[0] || null;
  }

  static async setVerificationState(id, resetSessionHash = null) {
    const query = `
      UPDATE password_reset_tokens
         SET verified_at = NOW(),
             reset_session_hash = ?,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
    `;
    await pool.execute(query, [resetSessionHash, id]);
  }

  static async markUsed(id) {
    const query = `
      UPDATE password_reset_tokens
         SET used = 1,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
    `;
    await pool.execute(query, [id]);
  }

  static async clearExpiredForUser(userId) {
    const query = `DELETE FROM password_reset_tokens WHERE user_id = ? AND expires_at <= NOW()`;
    await pool.execute(query, [userId]);
  }
}

module.exports = PasswordResetToken;
