// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    success: false,
    message: err.message || 'Internal Server Error',
    statusCode: err.statusCode || 500
  };

  // MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    if (err.message.includes('email')) {
      error.message = 'Email already exists';
      error.statusCode = 400;
    } else if (err.message.includes('nic_number')) {
      error.message = 'NIC number already exists';
      error.statusCode = 400;
    } else if (err.message.includes('committee_number')) {
      error.message = 'Committee number already exists';
      error.statusCode = 400;
    } else {
      error.message = 'Duplicate entry found';
      error.statusCode = 400;
    }
  }

  // MySQL foreign key constraint error
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    error.message = 'Organization committee number does not exist';
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.statusCode = 401;
  }

  // Multer errors
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error.message = 'File size too large. Maximum size is 5MB';
      error.statusCode = 400;
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      error.message = 'Too many files';
      error.statusCode = 400;
    } else {
      error.message = 'File upload error';
      error.statusCode = 400;
    }
  }

  // Validation errors
  if (err.isJoi) {
    error.message = err.details[0].message;
    error.statusCode = 400;
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

module.exports = {
  errorHandler,
  notFound
};
