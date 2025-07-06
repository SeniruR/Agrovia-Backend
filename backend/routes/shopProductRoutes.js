const express=require('express')
const router=express.Router();

const shopProductController = require('../controllers/shopProductController');
const validateShopProduct = require('../middleware/validateShopProduct');

router.post('/', validateShopProduct, shopProductController.createShopProduct);
router.get('/', shopProductController.getAllShopProducts);

module.exports = router;