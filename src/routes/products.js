const router = require('express').Router();
const { z } = require('zod');
const { Product } = require('../models/Product');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { asyncHandler } = require('../utils/asyncHandler');

const listQuerySchema = z.object({
  category: z
    .enum(['electrical', 'supplements', 'clothes_men', 'clothes_women', 'clothes_kids'])
    .optional(),
  q: z.string().min(1).max(80).optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(24),
  page: z.coerce.number().min(1).max(1000).optional().default(1),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { category, q, limit, page } = listQuerySchema.parse(req.query);

    const filter = { isActive: true, status: 'APPROVED' };
    if (category) filter.category = category;
    if (q) filter.title = { $regex: q, $options: 'i' };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title price currency images ratingAvg ratingCount stock category brand deliveryEtaDaysMin deliveryEtaDaysMax'),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  })
);

router.get(
  '/mine',
  requireAuth,
  requireRole(['SELLER']),
  asyncHandler(async (req, res) => {
    const items = await Product.find({ sellerId: req.user._id }).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, items });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive || product.status !== 'APPROVED') {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    return res.json({ success: true, item: product });
  })
);

router.get(
  '/category/:category',
  asyncHandler(async (req, res) => {
    const category = z
      .enum(['electrical', 'supplements', 'clothes_men', 'clothes_women', 'clothes_kids'])
      .parse(req.params.category);

    const items = await Product.find({ category, isActive: true, status: 'APPROVED' })
      .sort({ createdAt: -1 })
      .limit(60);
    return res.json({ success: true, items });
  })
);

module.exports = { productsRouter: router };
