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

    // Prepare data with safe defaults and handle optional/nullable fields
    // Ensure minimum_quantity_bulk is stored as null if blank/empty/invalid
    let minimum_quantity_bulk = req.body.minimum_quantity_bulk;
    if (minimum_quantity_bulk === '' || minimum_quantity_bulk === undefined || minimum_quantity_bulk === null) {
      minimum_quantity_bulk = null;
    } else if (!isNaN(minimum_quantity_bulk)) {
      minimum_quantity_bulk = Number(minimum_quantity_bulk);
      if (isNaN(minimum_quantity_bulk)) minimum_quantity_bulk = null;
    } else {
      minimum_quantity_bulk = null;
    }

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
      minimum_quantity_bulk, // ensure correct DB storage
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

// Delete a shop product by shopitemid
exports.deleteShopProduct = async (req, res) => {
  try {
    const { shopitemid } = req.params;
    if (!shopitemid) {
      return res.status(400).json({ error: 'Missing shopitemid parameter' });
    }
    const result = await ShopProductModel.deleteById(shopitemid);
    if (result.success) {
      return res.status(200).json({ message: 'Shop product deleted successfully', shopitemid });
    } else {
      return res.status(404).json({ error: 'Shop product not found', shopitemid });
    }
  } catch (error) {
    console.error('Error deleting shop product:', error);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Get a single shop product by shopitemid
exports.getShopProductById = async (req, res) => {
  try {
    // Accept shopitemid from either params or query for compatibility
    const shopitemid = req.params.shopitemid || req.query.shopitemid;
    if (!shopitemid) {
      return res.status(400).json({ error: 'Missing shopitemid parameter' });
    }
    const product = await ShopProductModel.findById(shopitemid);
    if (product) {
      product.organic_certified = Boolean(product.organic_certified);
      product.terms_accepted = Boolean(product.terms_accepted);
      product.images = product.images ? JSON.parse(product.images) : [];
      return res.status(200).json(product);
    } else {
      return res.status(404).json({ error: 'Shop product not found', shopitemid });
    }
  } catch (error) {

    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }

};

exports.updateProduct = async (req, res) => {
  try {
    const { shopitemid } = req.params;

    // Debug logs
    console.log('Request body:', req.body);
    console.log('Uploaded files count:', req.files?.length || 0);

    // Initialize update data with sanitized fields
    const updateData = {
      ...req.body,
      // Convert string booleans to actual booleans
      organic_certified: req.body.organic_certified === 'true',
      // Convert string numbers to actual numbers
      price: parseFloat(req.body.price),
      available_quantity: parseInt(req.body.available_quantity)
    };

    // Handle image updates
    if (req.files && req.files.length > 0) {
      // Process new uploaded files (assuming you're using Cloudinary or similar)
      const uploadResults = await Promise.all(
        req.files.map(file => {
          return new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              { folder: 'shop-products' },
              (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
              }
            ).end(file.buffer);
          });
        })
      );
      
      // Get remaining images that weren't deleted
      let remainingImages = [];
      if (req.body.remainingImages) {
        try {
          remainingImages = JSON.parse(req.body.remainingImages);
          if (!Array.isArray(remainingImages)) {
            throw new Error('remainingImages must be an array');
          }
        } catch (err) {
          console.error('Error parsing remainingImages:', err);
          return res.status(400).json({ 
            success: false,
            message: 'Invalid remainingImages format'
          });
        }
      }

      // Combine new and remaining images
      updateData.images = [...uploadResults, ...remainingImages];
    }

    // Remove fields that shouldn't be updated
    delete updateData.shopitemid;
    delete updateData.remainingImages;

    // Validate update data
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }

    // Perform the update
    const updatedProduct = await ShopProductModel.update(shopitemid, updateData);

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Successful response
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({
      success: false,

      message: 'Failed to delete product'
    });
  }
};


exports.updateProduct = async (req, res) => {
  try {
    const shopitemid = req.params.shopitemid;
    const body = req.body;
    const files = req.files || [];

    // Debug: Log received files
    console.log('Received files:', files);

    // 1. Get existing product
    const existingProduct = await ShopProductModel.findById(shopitemid);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // 2. Initialize updateData with existing values
    const updateData = { ...existingProduct };

    // 3. Handle image updates
    let keptImages = existingProduct.images || [];
    
    if (body.keptImages) {
      try {
        keptImages = typeof body.keptImages === 'string' 
          ? JSON.parse(body.keptImages) 
          : body.keptImages;
      } catch (e) {
        console.error('Error parsing keptImages:', e);
        keptImages = existingProduct.images || [];
      }
    }

    // Process new images
    const newImages = files
      .filter(f => {
        console.log('Processing file:', f);
        return f.fieldname === 'newImages' && f.path;
      })
      .map(f => {
        console.log('File path:', f.path);
        return f.path;
      });

    console.log('New images to add:', newImages);
    console.log('Existing kept images:', keptImages);

    // Always update images array if there are new images or keptImages was provided
    if (body.keptImages !== undefined || newImages.length > 0) {
      updateData.images = [
        ...keptImages.filter(img => typeof img === 'string' && img.trim() !== ''),
        ...newImages
      ].filter(Boolean);
    }

    console.log('Final images array:', updateData.images);

    // 4. Handle other field updates
    const fieldTypes = {
      organic_certified: 'boolean',
      price: 'number',
      available_quantity: 'number'
    };

    Object.keys(body).forEach(key => {
      if (key !== 'keptImages' && body[key] !== undefined && body[key] !== null) {
        switch (fieldTypes[key]) {
          case 'boolean':
            updateData[key] = body[key] ? 1 : 0;
            break;
          case 'number':
            updateData[key] = Number(body[key]);
            break;
          default:
            updateData[key] = body[key];
        }
      }
    });

    // 5. Perform the update
    console.log('Final update data:', updateData);
    const updateResult = await ShopProductModel.update(shopitemid, updateData);
    
    if (!updateResult.success) {
      return res.status(400).json({
        success: false,
        message: updateResult.message || 'Failed to update product'
      });
    }

    // 6. Return updated product
    const updatedProduct = await ShopProductModel.findById(shopitemid);

    res.status(200).json({
      success: true,
      data: updatedProduct,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });

      message: err.message || 'Internal server error during update'
    });

    console.error('Error fetching shop product by id:', error);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });

  }
};