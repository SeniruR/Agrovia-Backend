const Contact = require('../models/Contact');
const { formatResponse } = require('../utils/helpers');

// Submit a new contact message
const submitContact = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      subject,
      message,
      userType
    } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !subject || !message || !userType) {
      return res.status(400).json(formatResponse({
        success: false,
        message: 'All fields are required'
      }));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(formatResponse({
        success: false,
        message: 'Invalid email format'
      }));
    }

    // Validate phone number format
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json(formatResponse({
        success: false,
        message: 'Invalid phone number format'
      }));
    }

    // Get user ID if authenticated
    const userId = req.user ? req.user.id : null;

    const contactData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      subject: subject.trim(),
      message: message.trim(),
      user_type: userType,
      user_id: userId
    };

    const result = await Contact.create(contactData);

    if (result.success) {
      return res.status(201).json(formatResponse({
        success: true,
        message: 'Contact message submitted successfully',
        data: {
          contactId: result.contactId
        }
      }));
    } else {
      return res.status(500).json(formatResponse({
        success: false,
        message: 'Failed to submit contact message'
      }));
    }
  } catch (error) {
    console.error('Error submitting contact:', error);
    return res.status(500).json(formatResponse({
      success: false,
      message: 'Internal server error'
    }));
  }
};

// Get all contacts (admin only)
const getAllContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      userType,
      search,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      user_type: userType,
      search,
      sortBy,
      sortOrder
    };

    const result = await Contact.getAll(options);

    if (result.success) {
      return res.status(200).json(formatResponse({
        success: true,
        data: result.data,
        pagination: result.pagination
      }));
    } else {
      return res.status(500).json(formatResponse({
        success: false,
        message: 'Failed to fetch contacts'
      }));
    }
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return res.status(500).json(formatResponse({
      success: false,
      message: 'Internal server error'
    }));
  }
};

// Get contact by ID
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(formatResponse({
        success: false,
        message: 'Invalid contact ID'
      }));
    }

    const result = await Contact.getById(parseInt(id));

    if (result.success) {
      return res.status(200).json(formatResponse({
        success: true,
        data: result.data
      }));
    } else {
      return res.status(404).json(formatResponse({
        success: false,
        message: result.message
      }));
    }
  } catch (error) {
    console.error('Error fetching contact:', error);
    return res.status(500).json(formatResponse({
      success: false,
      message: 'Internal server error'
    }));
  }
};

// Update contact status (admin/moderator only)
const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || isNaN(id)) {
      return res.status(400).json(formatResponse({
        success: false,
        message: 'Invalid contact ID'
      }));
    }

    const validStatuses = ['pending', 'in_progress', 'resolved'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json(formatResponse({
        success: false,
        message: 'Invalid status. Must be one of: pending, in_progress, resolved'
      }));
    }

    const respondedBy = req.user ? req.user.id : null;
    const result = await Contact.updateStatus(parseInt(id), status, respondedBy);

    if (result.success) {
      return res.status(200).json(formatResponse({
        success: true,
        message: result.message
      }));
    } else {
      return res.status(404).json(formatResponse({
        success: false,
        message: result.message
      }));
    }
  } catch (error) {
    console.error('Error updating contact status:', error);
    return res.status(500).json(formatResponse({
      success: false,
      message: 'Internal server error'
    }));
  }
};

// Delete contact (admin only)
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json(formatResponse({
        success: false,
        message: 'Invalid contact ID'
      }));
    }

    const result = await Contact.delete(parseInt(id));

    if (result.success) {
      return res.status(200).json(formatResponse({
        success: true,
        message: result.message
      }));
    } else {
      return res.status(404).json(formatResponse({
        success: false,
        message: result.message
      }));
    }
  } catch (error) {
    console.error('Error deleting contact:', error);
    return res.status(500).json(formatResponse({
      success: false,
      message: 'Internal server error'
    }));
  }
};

// Get contact statistics (admin only)
const getContactStats = async (req, res) => {
  try {
    const result = await Contact.getStats();

    if (result.success) {
      return res.status(200).json(formatResponse({
        success: true,
        data: result.stats
      }));
    } else {
      return res.status(500).json(formatResponse({
        success: false,
        message: 'Failed to fetch contact statistics'
      }));
    }
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    return res.status(500).json(formatResponse({
      success: false,
      message: 'Internal server error'
    }));
  }
};

module.exports = {
  submitContact,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
  getContactStats
};
