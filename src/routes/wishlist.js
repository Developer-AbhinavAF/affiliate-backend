const router = require('express').Router();
const { z } = require('zod');

const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const { Wishlist } = require('../models/Wishlist');
const { Product } = require('../models/Product');

async function getOrCreateWishlist(userId) {
  const existing = await Wishlist.findOne({ userId });
  if (existing) return existing;
  return Wishlist.create({ userId, productIds: [] });
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const wishlist = await getOrCreateWishlist(req.user._id);
    const products = await Product.find({
      _id: { $in: wishlist.productIds },
      isActive: true,
      status: 'APPROVED',
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      items: products.map((p) => ({
        _id: p._id,
        title: p.title,
        price: p.price,
        currency: p.currency,
        imageUrl: p.images?.[0]?.url || '',
        ratingAvg: p.ratingAvg,
        ratingCount: p.ratingCount,
      })),
    });
  })
);

router.post(
  '/toggle',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { productId } = z.object({ productId: z.string().min(1) }).parse(req.body);
    const wishlist = await getOrCreateWishlist(req.user._id);

    const idx = wishlist.productIds.findIndex((x) => x.toString() === productId);
    if (idx >= 0) wishlist.productIds.splice(idx, 1);
    else wishlist.productIds.push(productId);

    await wishlist.save();
    res.json({ success: true, isInWishlist: idx < 0 });
  })
);

module.exports = { wishlistRouter: router };
