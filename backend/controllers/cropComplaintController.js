const CropComplaint = require('../models/CropComplaint');

// Create a new crop complaint (with BLOB attachments in main table)
exports.createComplaint = async (req, res, next) => {
  try {
    const {
      title,
      description,
      submittedBy,
      priority,
      cropType,
      farmer,
      category,
      orderNumber
    } = req.body;

    // Combine all uploaded files into a single BLOB array (as Buffer)
    let attachments = null;
    if (req.files && req.files.length > 0) {
      attachments = JSON.stringify(req.files.map(file => file.buffer.toString('base64')));
    }

    // Save complaint
    const result = await CropComplaint.create({
      title,
      description,
      submittedBy,
      priority,
      cropType,
      farmer,
      category,
      orderNumber: orderNumber === '' ? null : orderNumber,
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
    const complaints = await CropComplaint.findAll();
    res.json(complaints);
  } catch (error) {
    next(error);
  }
};

// Get a single complaint by ID
exports.getComplaintById = async (req, res, next) => {
  try {
    const complaint = await CropComplaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Not found' });
    res.json(complaint);
  } catch (error) {
    next(error);
  }
};

// Update a complaint
exports.updateComplaint = async (req, res, next) => {
  try {
    const updates = req.body;
    // If updating attachments
    if (req.files && req.files.length > 0) {
      updates.attachments = JSON.stringify(req.files.map(file => file.buffer.toString('base64')));
    }
    const result = await CropComplaint.update(req.params.id, updates);
    res.json({ success: true, result });
  } catch (error) {
    console.error('CropComplaint update error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
};

// Delete a complaint
exports.deleteComplaint = async (req, res, next) => {
  try {
    const result = await CropComplaint.delete(req.params.id);
    res.json({ success: true, result });
  } catch (error) {
    next(error);
  }
};
