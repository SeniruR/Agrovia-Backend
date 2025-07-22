const express = require('express');
const router = express.Router();
const multer = require('multer');

console.log('ShopProducts route loaded');
const upload = multer({ storage: multer.memoryStorage() });

const shopProductController = require('../controllers/shopProductController');
const validateShopProduct = require('../middleware/validateShopProduct');
const { authenticate, authorize } = require('../middleware/auth');
// routes/shopProducts.js
router.post(
  '/',
  authenticate,
  authorize(['shop_owner']),
 
  validateShopProduct,
  shopProductController.createShopProduct // Make sure this is properly imported
);

router.get('/my-shop', 
  authenticate, // This should add req.user
  shopProductController.getMyShopProducts
);
router.get('/my-shop-view', 
  authenticate, // This should add req.user
  shopProductController.getAllViewMyShopProducts
);
router.get('/', shopProductController.getAllShopProducts);
//router.get('/:shopitemid', shopController.getItemById);
router.delete('/:shopitemid', shopProductController.deleteShopProduct);
router.get('/:shopitemid', shopProductController.getShopProductById);
// routes/shopProductRoutes.js
router.put('/:shopitemid', upload.array('images'), shopProductController.updateProduct);
module.exports = router;