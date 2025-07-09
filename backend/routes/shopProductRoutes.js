const express = require('express');
const router = express.Router();
const multer = require('multer');

console.log('ShopProducts route loaded');
const upload = multer({ storage: multer.memoryStorage() });

const shopProductController = require('../controllers/shopProductController');
const validateShopProduct = require('../middleware/validateShopProduct');

router.post('/', validateShopProduct, shopProductController.createShopProduct);
router.get('/', shopProductController.getAllShopProducts);
//router.get('/:shopitemid', shopController.getItemById);
router.delete('/:shopitemid', shopProductController.deleteShopProduct);
router.get('/shopitemid', shopProductController.getShopProductById);
// routes/shopProductRoutes.js
router.put('/:shopitemid', upload.array('images'), shopProductController.updateProduct);
module.exports = router;