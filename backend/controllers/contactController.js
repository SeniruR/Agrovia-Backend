const ContactMessage = require('../models/ContactMessage');
const { validate: uuidValidate } = require('uuid');

const createMessage = async (req, res) => {
  try {
    const payload = req.body || {};
    const { name, email, type, category, message, anonymous = false, source } = payload;

    console.log('Contact createMessage called. payload:', payload);

    if (!type || !message) {
      return res.status(400).json({ success: false, message: 'Type and message are required' });
    }

    const user_id = req.user ? req.user.id : null;

  const saved = await ContactMessage.create({ user_id, name, email, type, category, message, anonymous, source });
  console.log('Contact saved:', saved);
  return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('createMessage error', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listMessages = async (req, res) => {
  try {
    const { limit = 50, offset = 0, type } = req.query;
    const rows = await ContactMessage.list({ limit, offset, type });
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listMessages error', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await ContactMessage.getById(id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('getMessage error', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await ContactMessage.delete(id);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('deleteMessage error', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createMessage,
  listMessages,
  getMessage,
  deleteMessage
};
