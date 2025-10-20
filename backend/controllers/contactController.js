const ContactMessage = require('../models/ContactMessage');
const { sendContactReplyEmail } = require('../utils/notify');

const createMessage = async (req, res) => {
  try {
  const payload = req.body || {};
  const { name, email, phone, type, category, message, anonymous = false, source } = payload;

    console.log('Contact createMessage called. payload:', payload);

    if (!type || !message) {
      return res.status(400).json({ success: false, message: 'Type and message are required' });
    }

    const user_id = req.user ? req.user.id : null;

  const saved = await ContactMessage.create({ user_id, name, email, phone, type, category, message, anonymous, source });
    console.log('Contact saved:', saved);
    return res.status(201).json({ success: true, data: saved });
  } catch (err) {
    console.error('createMessage error', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const listMessages = async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, status, search } = req.query;
    const rows = await ContactMessage.list({
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
      type: type || null,
      status: status || null,
      search: search || null
    });
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

const respondToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body || {};

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    const contact = await ContactMessage.getById(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact message not found' });
    }

    if (!contact.email) {
      return res.status(400).json({ success: false, message: 'Contact does not have an email address to reply to' });
    }

    try {
      await sendContactReplyEmail({
        to: contact.email,
        name: contact.name || contact.user_full_name || 'User',
        subject,
        message
      });
    } catch (emailErr) {
      console.error('sendContactReplyEmail error', emailErr && emailErr.message ? emailErr.message : emailErr);
      return res.status(502).json({ success: false, message: 'Failed to send email response' });
    }

    const updated = await ContactMessage.respond({
      id,
      responded_by: req.user ? req.user.id : null,
      response_subject: subject,
      response_message: message,
      status: 'responded'
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('respondToMessage error', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const allowed = ['pending', 'responded', 'discarded'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const contact = await ContactMessage.getById(id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact message not found' });
    }

    const updated = await ContactMessage.updateStatus({
      id,
      status,
      responded_by: req.user ? req.user.id : null
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateMessageStatus error', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createMessage,
  listMessages,
  getMessage,
  deleteMessage,
  respondToMessage,
  updateMessageStatus
};
