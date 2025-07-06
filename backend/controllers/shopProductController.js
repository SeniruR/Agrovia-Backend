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
      productType,
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
      organicCertified,
      termsAccepted,
      images
    } = req.body;

    console.log("Incoming data:", req.body);

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (isNaN(price) || parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    // Prepare data with safe defaults (avoid undefined)
    const productData = {
      shop_name: shop_name ?? null,
      owner_name: owner_name ?? null,
      email: email ?? null,
      phone_no: phone_no ?? null,
      shop_address: shop_address ?? null,
      city: city ?? null,
      product_type: productType ?? null,
      product_name: product_name ?? null,
      brand: brand ?? null,
      category: category ?? null,
      season: season ?? null,
      price: price !== undefined ? price : null,
      unit: unit ?? null,
      available_quantity: available_quantity !== undefined ? available_quantity : 0,
      product_description: product_description ?? null,
      features: features ?? null,
      usage_history: usage_history ?? null,
      organic_certified: organicCertified !== undefined ? organicCertified : false,
      terms_accepted: termsAccepted !== undefined ? termsAccepted : false,
      images: images ? JSON.stringify(images) : '[]'
    };

    const result = await ShopProductModel.create(productData);

    res.status(201).json({
      message: 'Shop product added successfully',
      shopitemid: result.insertId,
      data: {
        ...productData,
        productType,
        organicCertified,
        termsAccepted,
        images: images || []
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
      productType: product.product_type,
      organicCertified: product.organic_certified,
      termsAccepted: product.terms_accepted,
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
