const bcrypt = require('bcrypt');

// Hash password
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate random string
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Sanitize user data for response
const sanitizeUser = (user) => {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

// Format response
const formatResponse = (success, message, data = null, meta = null) => {
  const response = {
    success,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

// Validate Sri Lankan NIC
const validateNIC = (nic) => {
  // Old NIC format: 9 digits + V/X
  const oldNICPattern = /^[0-9]{9}[VXvx]$/;
  // New NIC format: 12 digits
  const newNICPattern = /^[0-9]{12}$/;
  
  return oldNICPattern.test(nic) || newNICPattern.test(nic);
};

// Validate Sri Lankan mobile number
const validateMobileNumber = (number) => {
  // Remove spaces, dashes, and parentheses
  const cleanNumber = number.replace(/[\s\-()]/g, '');
  
  // Sri Lankan mobile patterns
  const patterns = [
    /^(?:\+94|0094|94)?7[0-9]{8}$/, // Standard mobile
    /^(?:\+94|0094|94)?1[0-9]{8}$/, // Fixed line
  ];
  
  return patterns.some(pattern => pattern.test(cleanNumber));
};

// File type validator
const isValidFileType = (mimetype) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  return allowedTypes.includes(mimetype);
};

// Get file extension from mimetype
const getFileExtension = (mimetype) => {
  const extensions = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png'
  };
  return extensions[mimetype] || '';
};

module.exports = {
  hashPassword,
  comparePassword,
  generateRandomString,
  sanitizeUser,
  formatResponse,
  validateNIC,
  validateMobileNumber,
  isValidFileType,
  getFileExtension
};
