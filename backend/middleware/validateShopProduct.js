module.exports = (req, res, next) => {
  // Required fields from your form and database
  const requiredFields = [
    'shop_name',
    'owner_name',
    'email',
    'phone_no',
    'shop_address',
    'city',
    'productType', // New column (product_type in DB)
    'product_name',
    'price',
    'unit',
    'available_quantity',
    'product_description',
    'features', // New column
    'usage_history',
    'season',
    'organicCertified', // New column (organic_certified in DB)
    'termsAccepted' // New column (terms_accepted in DB)
  ];

  // Check for missing required fields
  const missingFields = requiredFields.filter(field => {
    // Special handling for boolean fields that might be false
    if (field === 'organicCertified' || field === 'termsAccepted') {
      return req.body[field] === undefined; // Only invalid if undefined (not if false)
    }
    return !req.body[field];
  });

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      missingFields,
      message: `Please provide all required fields. Missing: ${missingFields.join(', ')}`
    });
  }

  // Additional validations
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (!/^(\+94|0)?[0-9]{9,10}$/.test(phone_no.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Invalid Sri Lankan phone number' });
  }

  if (isNaN(price) || parseFloat(price) <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  // Validate productType is one of the allowed values
  const validProductTypes = ['seeds', 'fertilizer', 'chemical'];
  if (!validProductTypes.includes(productType)) {
    return res.status(400).json({ 
      error: 'Invalid product type',
      validTypes: validProductTypes
    });
  }

  next();
};