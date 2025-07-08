
const ShopComplaint = require('../models/ShopComplaint');
const ShopComplaintAttachment = require('../models/ShopComplaintAttachment');
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
      purchaseDate,
      attachments
      
    } = req.body;

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
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await ShopComplaintAttachment.create({
          complaint_id: complaintId,
          filename: file.originalname,
          mimetype: file.mimetype,
          filedata: file.buffer
        });
      }
    }

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

// Get a single complaint by ID (with attachment metadata)
exports.getComplaintById = async (req, res, next) => {
  try {
    const complaint = await ShopComplaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });
    // Get attachment metadata
    const attachments = await ShopComplaintAttachment.findByComplaintId(req.params.id);
    res.json({ ...complaint, attachments });
  } catch (error) {
    next(error);
  }
};

// Download a single attachment by attachment ID
exports.downloadAttachment = async (req, res, next) => {
  try {
    const attachment = await ShopComplaintAttachment.findById(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
    res.setHeader('Content-Type', attachment.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.send(attachment.filedata);
  } catch (error) {
    next(error);
  }
};

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
