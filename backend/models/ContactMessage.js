const db = require('../config/database');

const baseSelect = `
  SELECT
    cm.*,
    u.full_name AS user_full_name,
    u.email AS user_email,
    responder.full_name AS responder_full_name,
    responder.email AS responder_email
  FROM contact_messages cm
  LEFT JOIN users u ON cm.user_id = u.id
  LEFT JOIN users responder ON cm.responded_by = responder.id
`;

const create = async ({ user_id = null, name = null, email = null, phone = null, type = 'feedback', category = null, message, anonymous = false, source = 'web', status = 'pending' }) => {
  const sql = `INSERT INTO contact_messages (user_id, name, email, phone, type, category, message, anonymous, source, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  try {
    const [res] = await db.execute(sql, [user_id, name, email, phone, type, category, message, anonymous ? 1 : 0, source, status]);
    return getById(res.insertId);
  } catch (err) {
    console.error('ContactMessage.create DB error:', err && err.message ? err.message : err);
    throw err;
  }
};

const list = async ({ limit = 50, offset = 0, type = null, status = null, search = null } = {}) => {
  let sql = `${baseSelect}`;
  const params = [];
  const whereClauses = [];

  if (type) {
    whereClauses.push(`cm.type = ?`);
    params.push(type);
  }

  if (status) {
    whereClauses.push(`cm.status = ?`);
    params.push(status);
  }

  if (search) {
    whereClauses.push(`(
      cm.name LIKE ? OR
      cm.email LIKE ? OR
      cm.category LIKE ? OR
      cm.message LIKE ?
    )`);
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  if (whereClauses.length) {
    sql += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  const numericLimit = Number.parseInt(limit, 10);
  const safeLimit = Number.isNaN(numericLimit) ? 50 : Math.min(Math.max(numericLimit, 1), 500);
  const numericOffset = Number.parseInt(offset, 10);
  const safeOffset = Number.isNaN(numericOffset) ? 0 : Math.max(numericOffset, 0);

  sql += ` ORDER BY cm.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;

  const [rows] = await db.execute(sql, params);
  return rows;
};

const getById = async (id) => {
  const sql = `${baseSelect} WHERE cm.id = ? LIMIT 1`;
  const [rows] = await db.execute(sql, [id]);
  return rows[0] || null;
};

const remove = async (id) => {
  const sql = `DELETE FROM contact_messages WHERE id = ?`;
  const [res] = await db.execute(sql, [id]);
  return res.affectedRows > 0;
};

const respond = async ({ id, responded_by, response_subject, response_message, status = 'responded' }) => {
  const sql = `
    UPDATE contact_messages
       SET status = ?,
           response_subject = ?,
           response_message = ?,
           responded_by = ?,
           responded_at = CURRENT_TIMESTAMP
     WHERE id = ?
  `;
  const params = [status, response_subject, response_message, responded_by || null, id];
  const [res] = await db.execute(sql, params);
  if (res.affectedRows === 0) {
    return null;
  }
  return getById(id);
};

const updateStatus = async ({ id, status, responded_by = null }) => {
  const allowedStatuses = ['pending', 'responded', 'discarded'];
  if (!allowedStatuses.includes(status)) {
    throw new Error('Invalid contact message status');
  }

  const sql = `
    UPDATE contact_messages
       SET status = ?,
           responded_by = ?,
           responded_at = CASE WHEN ? IS NULL THEN responded_at ELSE CURRENT_TIMESTAMP END
     WHERE id = ?
  `;
  const [res] = await db.execute(sql, [status, responded_by || null, responded_by || null, id]);
  if (res.affectedRows === 0) {
    return null;
  }
  return getById(id);
};

module.exports = {
  create,
  list,
  getById,
  delete: remove,
  respond,
  updateStatus
};
