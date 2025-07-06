module.exports = (req, res, next) => {
  const {
    shop_name,
    owner_name,
    email,
    phone_no,
    shop_address,
    city,
    productType,
    product_name,
    price,
    unit,
    available_quantity,
    product_description,
    features,
    usage_history,
    season,
    organicCertified,
    termsAccepted
  } = req.body;

  const requiredFields = [
    'shop_name',
    'owner_name',
    'email',
    'phone_no',
    'shop_address',
    'city',
    'productType',
    'product_name',
    'price',
    'unit',
    'available_quantity',
    'product_description',
    'features',
    'usage_history',
    'season',
    'organicCertified',
    'termsAccepted'
  ];

  const missingFields = requiredFields.filter(field => {
    if (field === 'organicCertified' || field === 'termsAccepted') {
      return req.body[field] === undefined;
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

  // Email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Sri Lankan phone number validation
  if (!/^(\+94|0)?[0-9]{9,10}$/.test(phone_no.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Invalid Sri Lankan phone number' });
  }

  // Price validation
  if (isNaN(price) || parseFloat(price) <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  // Product type validation
  const validProductTypes = ['seeds', 'fertilizer', 'chemical'];
  if (!validProductTypes.includes(productType)) {
    return res.status(400).json({
      error: 'Invalid product type',
      validTypes: validProductTypes
    });
  }

  next();
};
