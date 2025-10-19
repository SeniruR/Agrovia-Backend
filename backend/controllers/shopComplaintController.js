const ShopComplaint = require('../models/ShopComplaint');
const { pool } = require('../config/database');
// ShopComplaintAttachment import removed (deprecated)
const path = require('path');

// Optional dev logger (opt-in via DEBUG_ATTACHMENT_LOGS)
const devLog = (...args) => { if (process.env.DEBUG_ATTACHMENT_LOGS === 'true') console.log(...args); };

// Create a new shop complaint (with multiple BLOB attachments)
exports.createComplaint = async (req, res, next) => {
  try {
    const {
      title,
      description,
      submittedBy,
      priority,
      shopId,
      location,
      category,
      orderNumber,
      purchaseDate,
      userId
    } = req.body;

    let attachments = req.body.attachments;
    
    // Handle file uploads
    if (req.files && req.files.length > 0) {
      devLog('Processing file uploads:', req.files.length, 'files');
      devLog('File details:', req.files.map(f => ({name: f.originalname, size: f.size, mimetype: f.mimetype})));
      
      // Store the file directly as base64 string
      if (req.files.length === 1) {
        const fileBuffer = req.files[0].buffer;
        attachments = fileBuffer.toString('base64');
        devLog('Stored single image as base64 string, length:', attachments.length);
        
        // Quick validation of the base64 string
        if (attachments.startsWith('[') || attachments.startsWith('{')) {
          console.warn('Warning: Base64 string has unexpected format');
        }
      } else {
        // Multiple files, store as JSON array of base64 strings
        attachments = JSON.stringify(req.files.map(file => file.buffer.toString('base64')));
        devLog('Stored multiple images as JSON array');
      }
    }

    // Save complaint
    const result = await ShopComplaint.create({
      title,
      description,
      submittedBy: parseInt(submittedBy, 10),
      priority,
      shopId: parseInt(shopId, 10),
      location,
      category,
      orderNumber,
      purchaseDate,
      attachments,
      // If userId isn't provided explicitly, use submittedBy as the userId
      userId: userId ? parseInt(userId, 10) : parseInt(submittedBy, 10)
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
  devLog('Sending shop complaint:', complaint.id);
    
    // Validate image data if present
    if (complaint.image) {
      devLog('Image data type:', typeof complaint.image);
      devLog('Image data length:', complaint.image.length);
      // Check for common issues
      if (typeof complaint.image === 'string') {
        const firstChars = complaint.image.substring(0, 30);
        devLog('Image data starts with:', firstChars);
        if (firstChars.includes('[') || firstChars.includes('{')) {
    devLog('Warning: Image data might be in an incorrect format');
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
    devLog('Update shop complaint payload:', JSON.stringify(payload));
    if (req.files && req.files.length > 0) {
      devLog('Received files:', req.files.length);
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
    // Normalize shop fields: map shopName/shop_name to shop_id when possible
    try {
      if (payload.shopId && !payload.shop_id) {
        payload.shop_id = payload.shopId;
        delete payload.shopId;
      }
      if (payload.shopId === undefined && payload.shop_id === undefined && payload.shopName) {
        // try lookup by shop name
        const [rows] = await pool.execute('SELECT id FROM shop_details WHERE shop_name = ? LIMIT 1', [payload.shopName]);
        if (rows && rows.length) {
          payload.shop_id = rows[0].id;
        }
      }
      // if incoming key is snake_case shop_name, attempt lookup as well
      if (payload.shop_name && !payload.shop_id) {
        const [rows2] = await pool.execute('SELECT id FROM shop_details WHERE shop_name = ? LIMIT 1', [payload.shop_name]);
        if (rows2 && rows2.length) payload.shop_id = rows2[0].id;
      }
      // remove any direct shopName/shop_name keys so model won't try to update non-existent columns
      delete payload.shopName;
      delete payload.shop_name;
    } catch (err) {
      devLog('Error resolving shop name to id:', err.message);
    }
    // Log final payload before DB update
    devLog('Final payload for DB update:', JSON.stringify(payload));
    try {
      const result = await ShopComplaint.update(req.params.id, payload);
      devLog('DB update result:', result);
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

// Deactivate the shop owner account related to this complaint
exports.deactivateShopOwner = async (req, res, next) => {
  const complaintId = req.params.id;
  try {
    const complaint = await ShopComplaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found' });

    // Determine shop id
    const shopId = complaint.shop_id || complaint.shopId || complaint.shop_id;
    if (!shopId) return res.status(400).json({ error: 'No shop associated with this complaint' });

    // Find shop owner user_id from shop_details
    const [rows] = await pool.execute('SELECT user_id FROM shop_details WHERE id = ?', [shopId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Shop not found' });
    const ownerUserId = rows[0].user_id;
    if (!ownerUserId) return res.status(404).json({ error: 'Shop owner not found' });

    // Deactivate the user account (set is_active = false)
    const [updateResult] = await pool.execute('UPDATE users SET is_active = FALSE WHERE id = ?', [ownerUserId]);
    if (updateResult.affectedRows === 0) return res.status(404).json({ error: 'User not found' });
    // Also mark the shop_details row as inactive for this shop
    try {
      await pool.execute('UPDATE shop_details SET is_active = 0 WHERE id = ?', [shopId]);
    } catch (err) {
      devLog('Failed to mark shop_details as inactive:', err.message);
      // continue even if this fails
    }

    // Record the disable action for auditability
    try {
      await pool.execute('INSERT INTO disable_accounts (user_id, case_id) VALUES (?, ?)', [ownerUserId, complaintId]);
    } catch (err) {
      // don't fail the whole operation if audit insert fails
      devLog('Failed to insert disable_accounts record:', err.message);
    }

    res.json({ success: true, message: 'Shop owner account deactivated', userId: ownerUserId, shopId });
  } catch (error) {
    console.error('Error in deactivateShopOwner:', error);
    next(error);
  }
};

// Add or update admin reply for a shop complaint
exports.addReply = async (req, res, next) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ success: false, message: 'Reply is required' });
    
    // Set replyed_at to current timestamp
    const result = await ShopComplaint.update(req.params.id, { reply, replyed_at: new Date() });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    
    res.json({ success: true, message: 'Reply added' });
  } catch (error) {
    console.error('Error in addReply:', error);
    next(error);
  }
};

// Delete admin reply for a shop complaint
exports.deleteReply = async (req, res, next) => {
  try {
    // Update to set reply to null and replyed_at to null
    const result = await ShopComplaint.update(req.params.id, { reply: null, replyed_at: null });
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    
    res.json({ success: true, message: 'Reply deleted successfully' });
  } catch (error) {
    console.error('Error deleting reply:', error);
    next(error);
  }
};
