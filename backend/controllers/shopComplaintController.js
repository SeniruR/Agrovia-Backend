const ShopComplaint = require('../models/ShopComplaint');
// ShopComplaintAttachment import removed (deprecated)
const path = require('path');

// Create a new shop complaint (with multiple BLOB attachments)
exports.createComplaint = async (req, res, next) => {
  try {
    const {
      title,
      description,
      submittedBy,
      priority,
      shopName,
      location,
      category,
      orderNumber,
      purchaseDate
    } = req.body;

    let attachments = req.body.attachments;
    // Handle file uploads
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => file.filename);
    }

    // Save complaint
    const result = await ShopComplaint.create({
      title,
      description,
      submittedBy,
      priority,
      shopName,
      location,
      category,
      orderNumber,
      purchaseDate,
      attachments 
    });
    const complaintId = result.insertId;

    // Save each attachment as a BLOB in shop_complaint_attachments

    res.status(201).json({ success: true, message: 'Complaint submitted', id: complaintId });
  } catch (error) {
    next(error);
  }
};

// Get all complaints
exports.getAllComplaints = async (req, res, next) => {
  try {
    const complaints = await ShopComplaint.findAll();
    res.json(complaints);
  } catch (error) {
    next(error);
  }
};

// Get a single complaint by ID (with image data)
exports.getComplaintById = async (req, res, next) => {
  try {
    const complaint = await ShopComplaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    // No need to fetch attachments separately; image is included in complaint
    res.json(complaint);
  } catch (error) {
    next(error);
  }
};

// Download a single attachment by attachment ID


// Update a complaint
exports.updateComplaint = async (req, res, next) => {
  try {
    const result = await ShopComplaint.update(req.params.id, req.body);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ success: true, message: 'Complaint updated' });
  } catch (error) {
    next(error);
  }
};

// Delete a complaint
exports.deleteComplaint = async (req, res, next) => {
  try {
    const result = await ShopComplaint.delete(req.params.id);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });
    res.json({ success: true, message: 'Complaint deleted' });
  } catch (error) {
    next(error);
  }
};
