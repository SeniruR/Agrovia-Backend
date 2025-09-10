const TransportComplaint = require('../models/TransportComplaint');

// Create a new transport complaint (with BLOB attachments in main table)
exports.createComplaint = async (req, res, next) => {
  try {
    const {
      title,
      description,
      submittedBy,
      priority,
      transportCompany,
      location,
      category,
      orderNumber,
      deliveryDate,
      trackingNumber
    } = req.body;

    // Combine all uploaded files into a single BLOB array (as Buffer)
    let attachments = null;
    if (req.files && req.files.length > 0) {
      // Store as JSON array of base64 strings (or Buffer array for MySQL LONGBLOB)
      attachments = JSON.stringify(req.files.map(file => file.buffer.toString('base64')));
    }

    // Prefer authenticated user id when available (req.user from auth middleware)
    const actorId = (req.user && req.user.id) ? req.user.id : (req.body.user_id || req.body.userId || null);

    // Save complaint
    const result = await TransportComplaint.create({
      title,
      description,
      submittedBy: actorId || submittedBy,
      priority,
      transportCompany,
      location,
      category,
      orderNumber: orderNumber === '' ? null : orderNumber,
      deliveryDate: deliveryDate === '' ? null : deliveryDate,
      trackingNumber: trackingNumber === '' ? null : trackingNumber,
      attachments,
      userId: actorId || null
    });

    res.status(201).json({ success: true, message: 'Complaint submitted', id: result.insertId });
  } catch (error) {
    next(error);
  }
};

// Get all complaints
exports.getAllComplaints = async (req, res, next) => {
  try {
    // If client requests only their complaints, use req.user.id when available or query.userId
    const { mine, userId: qUserId } = req.query;
    let complaints;
    if (mine === 'true') {
      const actorId = (req.user && req.user.id) ? req.user.id : (qUserId || null);
      const numericId = actorId ? Number(actorId) : null;
      complaints = await TransportComplaint.findAll(numericId);
    } else {
      complaints = await TransportComplaint.findAll();
    }
    res.json(complaints);
  } catch (error) {
    next(error);
  }
};

// Get a single complaint by ID (with attachment metadata)
exports.getComplaintById = async (req, res, next) => {
  try {
    const complaint = await TransportComplaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    // const attachments = await TransportComplaintAttachment.findByComplaintId(req.params.id);
    res.json({ ...complaint });
  } catch (error) {
    next(error);
  }
};

// Update a complaint
exports.updateComplaint = async (req, res, next) => {
  try {
    let payload = { ...req.body };
    // Handle file uploads for attachments
    if (req.files && req.files.length > 0) {
      payload.attachments = JSON.stringify(req.files.map(file => file.buffer.toString('base64')));
    }
    const result = await TransportComplaint.update(req.params.id, payload);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ success: true, message: 'Complaint updated' });
  } catch (error) {
    next(error);
  }
};

// Delete a complaint
exports.deleteComplaint = async (req, res, next) => {
  try {
    const result = await TransportComplaint.delete(req.params.id);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ success: true, message: 'Complaint deleted' });
  } catch (error) {
    next(error);
  }
};

// Admin: Deactivate transport company account related to this complaint
exports.deactivateTransportCompany = async (req, res, next) => {
  try {
    const { pool } = require('../config/database');
    const complaintId = req.params.id;

    // Find the complaint row to determine the transport company reference
    // Note: only select actual existing columns to avoid SQL errors
    const [rows] = await pool.execute('SELECT transport_company, user_id FROM transport_complaints WHERE id = ?', [complaintId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Complaint not found' });
    const row = rows[0];

    // Try fields that may reference the transport company user
    let ownerUserId = row.user_id || null;

    // If transport_company is numeric, treat it as user id
    if (!ownerUserId && row.transport_company) {
      const tc = row.transport_company;
      if (!isNaN(Number(tc))) ownerUserId = Number(tc);
    }

    // If still not found, try lookup by full_name among transport users (user_type = 4)
    if (!ownerUserId && row.transport_company && typeof row.transport_company === 'string') {
      const [urows] = await pool.execute('SELECT id FROM users WHERE full_name = ? AND user_type = 4 LIMIT 1', [row.transport_company]);
      if (urows && urows.length) ownerUserId = urows[0].id;
    }

    if (!ownerUserId) return res.status(404).json({ error: 'Transport company owner not found' });

    // Check user exists and active state
    const [userRows] = await pool.execute('SELECT id, full_name, is_active FROM users WHERE id = ?', [ownerUserId]);
    if (!userRows || userRows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRows[0];
    if (user.is_active === 0) return res.status(400).json({ message: 'Transport company account is already deactivated' });

    // Deactivate
    const [updateResult] = await pool.execute('UPDATE users SET is_active = 0 WHERE id = ?', [ownerUserId]);
    if (updateResult.affectedRows === 0) return res.status(500).json({ error: 'Failed to deactivate user' });

    // Audit record (non-fatal)
    try {
      await pool.execute('INSERT INTO disable_accounts (user_id, case_id) VALUES (?, ?)', [ownerUserId, complaintId]);
    } catch (e) {
      // ignore audit failures
      console.warn('Failed to insert disable_accounts audit record:', e.message);
    }

    res.json({ success: true, message: `Transport company account has been deactivated`, user: { id: user.id, full_name: user.full_name, is_active: 0 } });
  } catch (error) {
    console.error('Error in deactivateTransportCompany:', error);
    next(error);
  }
};
