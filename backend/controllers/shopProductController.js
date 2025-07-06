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
      product_name,
      brand,
      category,
      season,
      price,
      unit,
      available_quantity,
      product_description,
      usage_history
    } = req.body;

    console.log("📦 Incoming data:", req.body);

    if (!shop_name || !owner_name || !email || !product_name || !price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await ShopProductModel.create(req.body);
    res.status(201).json({
      message: 'Shop product added successfully',
      shopitemid: result.insertId
    });
  } catch (error) {
    console.error('Error creating shop product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllShopProducts = async (req, res) => {
  try {
    const products = await ShopProductModel.getAll();
    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching shop products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
