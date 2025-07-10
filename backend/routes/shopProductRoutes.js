const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer();



console.log('ShopProducts route loaded');
const upload = multer({ storage: multer.memoryStorage() });


// Corrected imports - consistent naming
const shopProductController = require('../controllers/shopProductController');
const validateShopProduct = require('../middleware/validateShopProduct');

// Product routes
router.post('/', validateShopProduct, shopProductController.createShopProduct);
router.get('/', shopProductController.getAllShopProducts);
router.get('/:shopitemid', shopProductController.getShopProductById);  // Uncommented and corrected
router.delete('/:shopitemid', shopProductController.deleteShopProduct);


// Update routes - using consistent controller name
router.patch(
  '/:shopitemid',
  upload.any(),
  shopProductController.updateProduct  // Changed from updateShopProduct to match your controller
);
router.put(
  '/:shopitemid', 
  upload.any(), 
  shopProductController.updateProduct   // Changed from productController to shopProductController
);


router.get('/shopitemid', shopProductController.getShopProductById);
// routes/shopProductRoutes.js
router.put('/:shopitemid', upload.array('images'), shopProductController.updateProduct);

module.exports = router;