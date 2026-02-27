const router = require('express').Router();

const { asyncHandler } = require('../utils/asyncHandler');
const { Product } = require('../models/Product');
const { ClickLog } = require('../models/ClickLog');

router.post(
  '/buy',
  asyncHandler(async (req, res) => {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    product.clicks = (product.clicks || 0) + 1;
    await product.save();

    await ClickLog.create({
      userId: req.user ? req.user._id : null,
      productId: product._id,
      sourceCompany: product.sourceCompany || '',
    });

    return res.json({ success: true });
  })
);

module.exports = { clicksRouter: router };

