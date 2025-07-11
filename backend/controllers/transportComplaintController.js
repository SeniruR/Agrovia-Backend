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

    // Save complaint
    const result = await TransportComplaint.create({
      title,
      description,
      submittedBy,
      priority,
      transportCompany,
      location,
      category,
      orderNumber: orderNumber === '' ? null : orderNumber,
      deliveryDate: deliveryDate === '' ? null : deliveryDate,
      trackingNumber: trackingNumber === '' ? null : trackingNumber,
      attachments
    });

    res.status(201).json({ success: true, message: 'Complaint submitted', id: result.insertId });
  } catch (error) {
    next(error);
  }
};

// Get all complaints
exports.getAllComplaints = async (req, res, next) => {
  try {
    const complaints = await TransportComplaint.findAll();
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
    const result = await TransportComplaint.update(req.params.id, req.body);
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
