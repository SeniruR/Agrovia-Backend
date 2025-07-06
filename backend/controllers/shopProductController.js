const ShopProductModel = require('../models/shopProductModel');

exports.createShopProduct = async (req, res) => {
  try {
    const {
      shop_name,
      owner_name,
      email,
      phone_no,
      shop_address,
      city,
      productType,       // New field
      product_name,
      brand,
      category,
      season,
      price,
      unit,
      available_quantity,
      product_description,
      features,           // New field
      usage_history,
      organicCertified,    // New field
      termsAccepted,       // New field
      images              // New field for image paths
    } = req.body;

    console.log("Incoming data:", req.body);

    // Enhanced required fields validation
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
      'product_description'
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields,
        message: `Please provide: ${missingFields.join(', ')}`
      });
    }

    // Additional validations
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    // Prepare data for database (mapping frontend names to DB columns)
    const productData = {
      shop_name,
      owner_name,
      email,
      phone_no,
      shop_address,
      city,
      product_type: productType,       // Map to DB column
      product_name,
      brand,
      category,
      season,
      price,
      unit,
      available_quantity,
      product_description,
      features,
      usage_history,
      organic_certified: organicCertified || false,  // Map to DB column
      terms_accepted: termsAccepted || false,        // Map to DB column
      images: images ? JSON.stringify(images) : null // Store images as JSON
    };

    const result = await ShopProductModel.create(productData);
    res.status(201).json({
      message: 'Shop product added successfully',
      shopitemid: result.insertId,
      data: {
        ...productData,
        productType,  // Include original field names in response
        organicCertified,
        termsAccepted
      }
    });
  } catch (error) {
    console.error('Error creating shop product:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getAllShopProducts = async (req, res) => {
  try {
    const products = await ShopProductModel.getAll();
    
    // Map database fields to frontend expected format
    const formattedProducts = products.map(product => ({
      ...product,
      productType: product.product_type,         // Map back to frontend name
      organicCertified: product.organic_certified,
      termsAccepted: product.terms_accepted,
      images: product.images ? JSON.parse(product.images) : [] // Parse JSON images
    }));

    res.status(200).json(formattedProducts);
  } catch (error) {
    console.error('Error fetching shop products:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};