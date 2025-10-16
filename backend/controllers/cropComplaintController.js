const CropComplaint = require('../models/CropComplaint');

// Optional dev logger
const devLog = (...args) => { if (process.env.DEBUG_ATTACHMENT_LOGS === 'true') console.log(...args); };

// Add or update admin reply for a crop complaint
exports.addReply = async (req, res, next) => {
  try {
    const { reply } = req.body;
    if (!reply) return res.status(400).json({ success: false, message: 'Reply is required' });
    // Set replyed_at to current timestamp
    const result = await CropComplaint.update(req.params.id, { reply, replyed_at: new Date() });
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    res.json({ success: true, message: 'Reply added' });
  } catch (error) {
    next(error);
  }
};

// Create a new crop complaint (with BLOB attachments in main table)
exports.createComplaint = async (req, res, next) => {
  try {
    const {
      title,
      description,
      submittedBy,
      priority,
      cropType,
      to_farmer,
      category,
      orderNumber
    } = req.body;

  // Debug: Log all received data (opt-in)
  devLog('Received request body:', req.body);
  devLog('to_farmer value:', to_farmer);
  devLog('to_farmer type:', typeof to_farmer);
  devLog('to_farmer is empty?', !to_farmer || to_farmer === '');

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
      to_farmer: to_farmer,
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
    console.log('Update crop complaint payload:', JSON.stringify(updates, null, 2));
    console.log('Complaint ID:', req.params.id);
    
    // Validate required fields
    if (!updates.title || !updates.description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Title and description are required' 
      });
    }
    
    // Validate priority values
    const validPriorities = ['low', 'medium', 'high'];
    if (updates.priority && !validPriorities.includes(updates.priority)) {
      // Map "urgent" to "high" for backwards compatibility
      if (updates.priority === 'urgent') {
        updates.priority = 'high';
      } else {
        return res.status(400).json({ 
          success: false, 
          error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` 
        });
      }
    }
    
    // Map frontend camelCase field names to database snake_case field names
    if (updates.cropType !== undefined) {
      updates.crop_type = updates.cropType;
      delete updates.cropType;
    }
    if (updates.orderNumber !== undefined) {
      updates.order_number = updates.orderNumber;
      delete updates.orderNumber;
    }
    if (updates.submittedBy !== undefined) {
      updates.submitted_by = updates.submittedBy;
      delete updates.submittedBy;
    }
    if (updates.farmer !== undefined) {
      updates.to_farmer = updates.farmer; // Map farmer to to_farmer for database
      delete updates.farmer;
    }
    
    if (req.files && req.files.length > 0) {
  devLog('Received files:', req.files.length);
      // Always store as JSON array of base64 strings
      updates.attachments = JSON.stringify(req.files.map(file => file.buffer.toString('base64')));
    }
    
    // Remove any undefined or null values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined || updates[key] === null) {
        delete updates[key];
      }
    });
    
  // Log final payload before DB update (opt-in)
  devLog('Final payload for DB update:', JSON.stringify(updates, null, 2));
    
    try {
      const result = await CropComplaint.update(req.params.id, updates);
  devLog('DB update result:', result);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false, 
          error: 'Complaint not found or no changes made' 
        });
      }
      
      res.json({ success: true, message: 'Complaint updated successfully', result });
    } catch (dbError) {
      console.error('DB error during crop complaint update:', dbError);
      res.status(500).json({ 
        success: false, 
        error: 'Database error', 
        details: dbError.message 
      });
    }
  } catch (error) {
    console.error('General error in updateComplaint:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal Server Error' 
    });
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

// Admin: Deactivate farmer account from crop complaint
exports.deactivateFarmer = async (req, res, next) => {
  try {
    const { pool } = require('../config/database');
    const complaintId = req.params.id;

    // Get the complaint details to find the farmer
    const [complaintRows] = await pool.execute(
      'SELECT to_farmer FROM crop_complaints WHERE id = ?', 
      [complaintId]
    );

    if (complaintRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Complaint not found' 
      });
    }

    const farmerId = complaintRows[0].to_farmer;
    
    if (!farmerId) {
      return res.status(400).json({ 
        success: false, 
        message: 'No farmer associated with this complaint' 
      });
    }

    // Get farmer details before deactivating
    const [farmerRows] = await pool.execute(
      'SELECT id, full_name, is_active FROM users WHERE id = ?', 
      [farmerId]
    );

    if (farmerRows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Farmer not found' 
      });
    }

    const farmer = farmerRows[0];

    if (farmer.is_active === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Farmer account is already deactivated' 
      });
    }

    // Deactivate the farmer account
    const [result] = await pool.execute(
      'UPDATE users SET is_active = 0 WHERE id = ?',
      [farmerId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to deactivate farmer account' 
      });
    }

    res.json({ 
      success: true, 
      message: `Farmer account "${farmer.full_name}" has been deactivated successfully`,
      farmer: {
        id: farmer.id,
        full_name: farmer.full_name,
        is_active: 0
      }
    });

  } catch (error) {
    console.error('❌ Deactivate farmer error:', error);
    next(error);
  }
};
