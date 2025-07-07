const ShopProductModel = require('../models/shopProductModel');

exports.createShopProduct = async (req, res) => {
  try {
    // Handle file uploads first
    const uploadedImages = req.files ? req.files.map(file => ({
      buffer: file.buffer.toString('base64'), // Convert buffer to base64
      mimetype: file.mimetype,
      originalname: file.originalname
    })) : [];

    // Get other fields from req.body
    const {
      shop_name,
      owner_name,
      email,
      phone_no,
      shop_address,
      city,
      product_type,
      product_name,
      brand,
      category,
      season,
      price,
      unit,
      available_quantity,
      product_description,
   
      usage_history,
      organic_certified,
      terms_accepted
    } = req.body;

    console.log("Incoming data:", { ...req.body, images: uploadedImages });

    // Required fields validation
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

    // Field format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!/^(\+94|0)?[0-9]{9,10}$/.test(phone_no.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Invalid Sri Lankan phone number' });
    }

    if (isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    // Product type validation
    const validProductTypes = ['seeds', 'fertilizer', 'chemical'];
    if (!validProductTypes.includes(product_type)) {
      return res.status(400).json({
        error: 'Invalid product type',
        validTypes: validProductTypes
      });
    }

    // Prepare data with safe defaults
    const productData = {
      shop_name: shop_name || null,
      owner_name: owner_name || null,
      email: email || null,
      phone_no: phone_no || null,
      shop_address: shop_address || null,
      city: city || null,
      product_type: product_type || null,
      product_name: product_name || null,
      brand: brand || null,
      category: category || null,
      season: season || null,
      price: price || 0,
      unit: unit || null,
      available_quantity: available_quantity || 0,
      product_description: product_description || null,
      
      usage_history: usage_history || null,
      organic_certified: organic_certified === 'true' || organic_certified === true,
      terms_accepted: terms_accepted === 'true' || terms_accepted === true,
      images: uploadedImages.length > 0 ? JSON.stringify(uploadedImages) : '[]'
    };

    const result = await ShopProductModel.create(productData);

    res.status(201).json({
      message: 'Shop product added successfully',
      shopitemid: result.insertId,
      data: {
        ...productData,
        images: uploadedImages
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

    const formattedProducts = products.map(product => ({
      ...product,
      organic_certified: Boolean(product.organic_certified),
      terms_accepted: Boolean(product.terms_accepted),
      images: product.images ? JSON.parse(product.images) : []
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

const getShopProductById = (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM shop_products WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error('Error fetching product by ID:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(results[0]);
  });
};