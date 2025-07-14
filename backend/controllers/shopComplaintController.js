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
      console.log('Processing file uploads:', req.files.length, 'files');
      console.log('File details:', req.files.map(f => ({name: f.originalname, size: f.size, mimetype: f.mimetype})));
      
      // Store the file directly as base64 string
      if (req.files.length === 1) {
        const fileBuffer = req.files[0].buffer;
        attachments = fileBuffer.toString('base64');
        console.log('Stored single image as base64 string, length:', attachments.length);
        
        // Quick validation of the base64 string
        if (attachments.startsWith('[') || attachments.startsWith('{')) {
          console.warn('Warning: Base64 string has unexpected format');
        }
      } else {
        // Multiple files, store as JSON array of base64 strings
        attachments = JSON.stringify(req.files.map(file => file.buffer.toString('base64')));
        console.log('Stored multiple images as JSON array');
      }
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
    
    // Debug info
    console.log('Sending shop complaint:', complaint.id);
    
    // Validate image data if present
    if (complaint.image) {
      console.log('Image data type:', typeof complaint.image);
      console.log('Image data length:', complaint.image.length);
      // Check for common issues
      if (typeof complaint.image === 'string') {
        const firstChars = complaint.image.substring(0, 30);
        console.log('Image data starts with:', firstChars);
        if (firstChars.includes('[') || firstChars.includes('{')) {
          console.log('Warning: Image data might be in an incorrect format');
        }
      }
    }
    
    res.json(complaint);
  } catch (error) {
    console.error('Error in getComplaintById:', error);
    next(error);
  }
};

// Download a single attachment by attachment ID


// Update a complaint
exports.updateComplaint = async (req, res, next) => {
  try {
    let payload = { ...req.body };
    // Debug incoming payload and files
    console.log('Update shop complaint payload:', JSON.stringify(payload));
    if (req.files && req.files.length > 0) {
      console.log('Received files:', req.files.length);
      if (req.files.length === 1) {
        const fileBuffer = req.files[0].buffer;
        payload.attachments = JSON.stringify([fileBuffer.toString('base64')]);
      } else {
        payload.attachments = JSON.stringify(req.files.map(file => file.buffer.toString('base64')));
      }
    }

    // Ensure purchaseDate is present and purchase_date is not
    if (payload.purchase_date) {
      payload.purchaseDate = payload.purchase_date;
      delete payload.purchase_date;
    }
    // Log final payload before DB update
    console.log('Final payload for DB update:', JSON.stringify(payload));
    try {
      const result = await ShopComplaint.update(req.params.id, payload);
      console.log('DB update result:', result);
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Complaint not found' });
      res.json({ success: true, message: 'Complaint updated' });
    } catch (dbError) {
      console.error('DB error during shop complaint update:', dbError);
      return res.status(500).json({ error: 'Database error', details: dbError.message });
    }
  } catch (error) {
    console.error('General error in updateComplaint:', error);
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
