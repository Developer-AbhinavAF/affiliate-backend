const express = require('express');
const { Wishlist } = require('../models/Wishlist');
const { Order } = require('../models/Order');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Get customer orders
router.get('/orders', requireAuth, asyncHandler(async (req, res) => {
  const orders = await Order.find({ customerId: req.user._id })
    .populate('items.productId', 'title images')
    .sort({ createdAt: -1 });
  res.json({ success: true, items: orders });
}));

// Get customer wishlist
router.get('/wishlist', requireAuth, asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOne({ userId: req.user._id }).populate('productIds');
  res.json({ success: true, items: wishlist?.productIds || [] });
}));

// Get customer account info
router.get('/account', requireAuth, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      username: req.user.username,
      email: req.user.email,
      phone: req.user.phone,
      avatarUrl: req.user.avatarUrl,
      addresses: req.user.addresses,
    },
  });
}));

// Update customer account
router.patch('/account', requireAuth, asyncHandler(async (req, res) => {
  const { name, phone, avatarUrl, addresses } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;
  if (addresses !== undefined) req.user.addresses = addresses;
  await req.user.save();
  res.json({ success: true });
}));

module.exports = { customerRouter: router };
