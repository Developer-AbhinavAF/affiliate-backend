const router = require('express').Router();
const { z } = require('zod');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { Cart } = require('../models/Cart');
const { Product } = require('../models/Product');

async function getOrCreateCart(userId) {
  const existing = await Cart.findOne({ userId });
  if (existing) return existing;
  return Cart.create({ userId, items: [] });
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    const productIds = cart.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true, status: 'APPROVED' });

    const byId = new Map(products.map((p) => [p._id.toString(), p]));
    const items = cart.items
      .map((i) => {
        const p = byId.get(i.productId.toString());
        if (!p) return null;
        return {
          productId: i.productId,
          qty: i.qty,
          product: {
            _id: p._id,
            title: p.title,
            price: p.price,
            currency: p.currency,
            imageUrl: p.images?.[0]?.url || '',
            stock: p.stock,
          },
          lineTotal: Number(p.price) * i.qty,
        };
      })
      .filter(Boolean);

    const subtotal = items.reduce((sum, x) => sum + x.lineTotal, 0);

    res.json({ success: true, items, subtotal });
  })
);

router.post(
  '/add',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { productId, qty } = z
      .object({ productId: z.string().min(1), qty: z.number().int().min(1).max(99).optional().default(1) })
      .parse(req.body);

    const product = await Product.findById(productId);
    if (!product || !product.isActive || product.status !== 'APPROVED') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: 'Out of stock' });
    }

    const cart = await getOrCreateCart(req.user._id);
    const existing = cart.items.find((i) => i.productId.toString() === productId);

    if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
    } else {
      cart.items.push({ productId, qty });
    }

    await cart.save();
    return res.json({ success: true });
  })
);

router.post(
  '/update',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { productId, qty } = z
      .object({ productId: z.string().min(1), qty: z.number().int().min(1).max(99) })
      .parse(req.body);

    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.find((i) => i.productId.toString() === productId);
    if (!item) return res.status(404).json({ success: false, message: 'Not in cart' });

    item.qty = qty;
    await cart.save();
    return res.json({ success: true });
  })
);

router.post(
  '/remove',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { productId } = z.object({ productId: z.string().min(1) }).parse(req.body);
    const cart = await getOrCreateCart(req.user._id);
    cart.items = cart.items.filter((i) => i.productId.toString() !== productId);
    await cart.save();
    return res.json({ success: true });
  })
);

router.post(
  '/clear',
  requireAuth,
  asyncHandler(async (req, res) => {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    return res.json({ success: true });
  })
);

module.exports = { cartRouter: router };
