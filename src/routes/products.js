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

const manageListQuerySchema = z.object({
  status: z
    .enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'])
    .optional(),
  q: z.string().min(1).max(80).optional(),
  page: z.coerce.number().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(25),
});

const baseProductSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  category: z.enum(['electrical', 'supplements', 'clothes_men', 'clothes_women', 'clothes_kids']),
  price: z.coerce.number().min(0),
  originalPrice: z.coerce.number().min(0).optional().default(0),
  sku: z.string().max(120).optional().default(''),
  stock: z.coerce.number().min(0),
  shippingCost: z.coerce.number().min(0).optional().default(0),
  tags: z.array(z.string().max(40)).optional().default([]),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED']).optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        publicId: z.string().min(1),
      })
    )
    .optional()
    .default([]),
});

const createProductSchema = baseProductSchema;
const updateProductSchema = baseProductSchema.partial();

function mapStatusAndActive(statusInput) {
  const status = statusInput || 'PENDING_APPROVAL';
  let isActive = true;
  if (status === 'DRAFT' || status === 'REJECTED' || status === 'SUSPENDED') {
    isActive = false;
  }
  return { status, isActive };
}

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
        .select(
          'title price currency images ratingAvg ratingCount stock category brand deliveryEtaDaysMin deliveryEtaDaysMax'
        ),
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

// Management list for dashboards (ADMIN / SUPER_ADMIN)
router.get(
  '/manage/all',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'ADMIN']),
  asyncHandler(async (req, res) => {
    const { status, q, page, limit } = manageListQuerySchema.parse(req.query);
    const filter = {};
    if (status) filter.status = status;
    if (q) filter.title = { $regex: q, $options: 'i' };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sellerId', 'name email'),
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

// Create product (ADMIN / SUPER_ADMIN / HELPER)
router.post(
  '/',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'ADMIN', 'HELPER']),
  asyncHandler(async (req, res) => {
    const payload = createProductSchema.parse(req.body);
    const { status, isActive } = mapStatusAndActive(payload.status);

    const doc = await Product.create({
      ...payload,
      status,
      isActive,
      sellerId: req.user._id,
    });

    res.status(201).json({ success: true, item: doc });
  })
);

// Update product
router.put(
  '/:id',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'ADMIN', 'HELPER']),
  asyncHandler(async (req, res) => {
    const payload = updateProductSchema.parse(req.body);
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });

    const isOwner = product.sellerId.toString() === req.user._id.toString();
    const isElevated = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role);
    if (!isElevated && !isOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (payload.status) {
      const { status, isActive } = mapStatusAndActive(payload.status);
      product.status = status;
      product.isActive = isActive;
      delete payload.status;
    }

    Object.assign(product, payload);
    await product.save();

    res.json({ success: true, item: product });
  })
);

// Delete product
router.delete(
  '/:id',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'ADMIN', 'HELPER']),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });

    const isOwner = product.sellerId.toString() === req.user._id.toString();
    const isElevated = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role);
    if (!isElevated && !isOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await Product.deleteOne({ _id: product._id });
    res.json({ success: true });
  })
);

module.exports = { productsRouter: router };
