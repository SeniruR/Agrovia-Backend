module.exports = (req, res, next) => {
  const { shop_name, owner_name, email, product_name, price } = req.body;

  if (!shop_name || !owner_name || !email || !product_name || !price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  next();
};
