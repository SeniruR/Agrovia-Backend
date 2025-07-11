const multer = require('multer');

// Configure storage (memory or disk)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 images
  }
}).array('images'); // Handle multiple files with field name 'images'

module.exports = [
  // File upload middleware
  (req, res, next) => {
    upload(req, res, function(err) {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({
          success: false,
          error: err.message
        });
      } else if (err) {
        // An unknown error occurred
        return res.status(500).json({
          success: false,
          error: 'File upload error'
        });
      }
      
      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "At least one product image is required"
        });
      }
      
      // Proceed to next middleware if no errors
      next();
    });
  },
  
  // Data validation middleware
  (req, res, next) => {
    const {
      shop_name,
      owner_name,
      email,
      phone_no,
      shop_address,
      city,
      product_type,
      product_name,
      price,
      unit,
      available_quantity,
      product_description,
      organic_certified,
      terms_accepted
    } = req.body;

    const requiredFields = [
      'shop_name',
      'owner_name',
      'email',
      'phone_no',
      'shop_address',
      'city',
      'product_type',
      'product_name',
      'price',
      'unit',
      'available_quantity',
      'product_description',
      'organic_certified',
      'terms_accepted'
    ];

    const missingFields = requiredFields.filter(field => {
      if (field === 'organic_certified' || field === 'terms_accepted') {
        return req.body[field] === undefined;
      }
      return !req.body[field];
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        missingFields,
        message: `Please provide all required fields. Missing: ${missingFields.join(', ')}`
      });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid email format' 
      });
    }

    // Sri Lankan phone number validation
    if (!/^(\+94|0)?[0-9]{9,10}$/.test(phone_no.replace(/\s/g, ''))) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid Sri Lankan phone number' 
      });
    }

    // Price validation
    if (isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Price must be a positive number' 
      });
    }

    // Product type validation
    const validProductTypes = ['seeds', 'fertilizer', 'chemical'];
    if (!validProductTypes.includes(product_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product type',
        validTypes: validProductTypes
      });
    }

    next();
  }
  
];
