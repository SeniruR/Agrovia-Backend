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
    const updates = { ...req.body };
    // Debug incoming payload and files
    console.log('Update crop complaint payload:', JSON.stringify(updates));
    if (req.files && req.files.length > 0) {
      console.log('Received files:', req.files.length);
      // Always store as JSON array of base64 strings
      updates.attachments = JSON.stringify(req.files.map(file => file.buffer.toString('base64')));
    }
    // Log final payload before DB update
    console.log('Final payload for DB update:', JSON.stringify(updates));
    try {
      const result = await CropComplaint.update(req.params.id, updates);
      console.log('DB update result:', result);
      res.json({ success: true, result });
    } catch (dbError) {
      console.error('DB error during crop complaint update:', dbError);
      res.status(500).json({ error: 'Database error', details: dbError.message });
    }
  } catch (error) {
    console.error('General error in updateComplaint:', error);
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
