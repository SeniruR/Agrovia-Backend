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

    const formattedProducts = products.map(product => {
      // Handle Boolean fields
      const organic_certified = Boolean(product.organic_certified);
      const terms_accepted = Boolean(product.terms_accepted);

      let images = [];

      // Case 1: If image is a Buffer (single image in BLOB column)
      if (Buffer.isBuffer(product.images)) {
        const base64Image = product.images.toString('base64');
        images = [`data:image/jpeg;base64,${base64Image}`]; // or image/png if that's your format
      }

      // Case 2: If image is stored as a JSON string
      else if (typeof product.images === 'string') {
        if (typeof product.images === 'string') {
  try {
    const parsed = JSON.parse(product.images);
    if (Array.isArray(parsed)) {
      images = parsed.map(img => {
        if (img.buffer && img.mimetype) {
          return `data:${img.mimetype};base64,${img.buffer}`;
        }
        return img;
      });
    } else {
      images = [parsed];
    }
  } catch (err) {
    images = [product.images]; // fallback if not valid JSON
  }
}
}

if (Buffer.isBuffer(product.images)) {
  const base64Image = product.images.toString('base64');
  images = [`data:image/jpeg;base64,${base64Image}`];
}

      return {
        ...product,
        organic_certified,
        terms_accepted,
        images
      };
    });

    res.status(200).json(formattedProducts);
  } catch (error) {
    console.error('Error fetching shop products:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/*const getShopProductById = (req, res) => {
  const { id } = req.params;
  const sql = 'SELECT * FROM shop_products WHERE id = ?';
  db.query(sql, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching product', error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(results[0]);
  });
};
*/

exports.getShopProductById = async (req, res) => {
  try {
    const product = await ShopProductModel.findById(req.params.shopitemid);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      product: {
        id: product.id,
        // Include only the ID or minimal essential fields
        // Add other minimal fields if absolutely necessary
      }
    });

  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};
exports.deleteShopProduct = async (req, res) => {
  try {
    const result = await ShopProductModel.deleteById(req.params.shopitemid);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      affectedRows: result.affectedRows
    });

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
  }
};