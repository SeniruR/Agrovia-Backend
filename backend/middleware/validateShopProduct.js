const multer = require('multer');
const jwt = require('jsonwebtoken');

// Configure storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 images
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WebP are allowed'), false);
    }
  }
});

module.exports = (req, res, next) => {
  // First handle authentication
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ 
      error: 'Authorization token required',
      code: 'AUTH_REQUIRED'
    });
  }

  // Verify JWT
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
  } catch (err) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }

  // Then handle file upload and form data
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('File upload error:', err);
      
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          error: err.code === 'LIMIT_UNEXPECTED_FILE' 
            ? 'Invalid file field name' 
            : err.message,
          code: err.code
        });
      }
      
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }

    // Validate at least one image was uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one product image is required"
      });
    }

    // Combine body fields and file data
    req.body.images = req.files;
    
    // Validate required fields
    const requiredFields = [
      'shop_name', 'owner_name', 'email', 'phone_no', 
      'shop_address', 'city', 'product_type', 'product_name',
      'price', 'unit', 'product_description',
      'organic_certified', 'terms_accepted'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Validate phone number
    if (!/^(\+94|0)?[0-9]{9,10}$/.test(req.body.phone_no.replace(/\s/g, ''))) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid Sri Lankan phone number' 
      });
    }

    // Validate price
    if (isNaN(req.body.price) || parseFloat(req.body.price) <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Price must be a positive number' 
      });
    }

    // Validate product type
    const validProductTypes = ['seeds', 'fertilizer', 'chemical'];
    if (!validProductTypes.includes(req.body.product_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product type',
        validTypes: validProductTypes
      });
    }

    // If all validations pass, proceed to controller
    next();
  });
};