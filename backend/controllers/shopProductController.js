const ShopProductModel = require('../models/shopProductModel');
//const ShopProductModel = require('../models/shopProductModel');

exports.createShopProduct = async (req, res) => {
  try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. User not found in request.'
        });
      }
        if (req.user.role !== 'shop_owner') {
        return res.status(403).json({
          success: false,
          message: 'Only farmers can create crop posts.'
        });
      }
       const userId = req.user.id;
      console.log('✅ Creating shop item for User ID:', userId);
  
     console.log('Received files:', req.files); // Log received files
    console.log('Received body:', req.body); // Log received data
    // Process form data
    const {
      shop_name, owner_name, email, phone_no, shop_address, city,
      product_type, product_name, brand, category, season, price,
      unit, available_quantity, product_description, usage_history,
      organic_certified, terms_accepted, category_other
    } = req.body;

    // Process uploaded files
    const uploadedImages = req.files.map(file => ({
      buffer: file.buffer.toString('base64'),
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size
    }));

    // Prepare product data
    const productData = {
      shop_name,
      owner_name,
      email,
      phone_no,
      shop_address,
      city,
      product_type,
      product_name,
      brand,
      category: category === "Other" ? category_other : category,
      season: season || null,
      price: parseFloat(price),
      unit: unit || null,
      available_quantity: parseInt(available_quantity) || 0,
      product_description,
      usage_history: usage_history || null,
      organic_certified: organic_certified === 'true' || organic_certified === true,
      terms_accepted: terms_accepted === 'true' || terms_accepted === true,
      images: JSON.stringify(uploadedImages),
      user_id: userId // From middleware
    };

    // Database insertion
    const result = await ShopProductModel.create(productData);

    return res.status(201).json({
      success: true,
      message: 'Shop product created successfully',
      productId: result.insertId,
      data: {
        ...productData,
        images: uploadedImages.length
      }
    });

  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      files: req.files
    });
    console.error('Error creating shop product:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack
      } : undefined
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
exports.getMyShopProducts = async (req, res) => {
  try {
    const products = await ShopProductModel.getAllByUserId(req.user.id);
    
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
        // Case 2: Images is a string (could be JSON or comma-separated)
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
    res.status(200).json({ 
      success: true, 
      data: formattedProducts
    });
  } catch (error) {
    console.error('Error fetching shop products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error',
      error: error.message
    });
  }
};
// Helper function

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
      message: err.message || 'Internal server error during update'
    });
  }
};