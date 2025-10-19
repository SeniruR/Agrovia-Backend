const db = require('../config/database');

const create = async ({ user_id = null, name = null, email = null, type = 'feedback', category = null, message, anonymous = false, source = 'web' }) => {
  const sql = `INSERT INTO contact_messages (user_id, name, email, type, category, message, anonymous, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  try {
    const [res] = await db.execute(sql, [user_id, name, email, type, category, message, anonymous ? 1 : 0, source]);
    return { id: res.insertId, user_id, name, email, type, category, message, anonymous: !!anonymous, source, created_at: new Date() };
  } catch (err) {
    console.error('ContactMessage.create DB error:', err && err.message ? err.message : err);
    throw err;
  }
};

const list = async ({ limit = 50, offset = 0, type = null } = {}) => {
  let sql = `SELECT * FROM contact_messages`;
  const params = [];
  if (type) {
    sql += ` WHERE type = ?`;
    params.push(type);
  }
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit));
  params.push(Number(offset));
  const [rows] = await db.execute(sql, params);
  return rows;
};

const getById = async (id) => {
  const sql = `SELECT * FROM contact_messages WHERE id = ? LIMIT 1`;
  const [rows] = await db.execute(sql, [id]);
  return rows[0] || null;
};

const remove = async (id) => {
  const sql = `DELETE FROM contact_messages WHERE id = ?`;
  const [res] = await db.execute(sql, [id]);
  return res.affectedRows > 0;
};

module.exports = {
  create,
  list,
  getById,
  delete: remove
};
