const express = require('express');
const bcrypt = require('bcryptjs');

const { User } = require('../models/User');
const { Product } = require('../models/Product');
const { Order } = require('../models/Order');
const { Cart } = require('../models/Cart');
const { Wishlist } = require('../models/Wishlist');
const { PlatformSettings } = require('../models/PlatformSettings');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// Get all admins (excluding superadmin)
router.get('/admins', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const admins = await User.find({ role: 'ADMIN' }).select('-passwordHash').sort({ createdAt: -1 });
  res.json({ success: true, items: admins });
}));

// Create admin
router.post('/admins', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;
  const existing = await User.findOne({ $or: [{ email }, { username }, { name }] });
  if (existing) return res.status(400).json({ message: 'Email or username already exists' });
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await User.create({ name, username, email, passwordHash, role: 'ADMIN' });
  await admin.save();
  res.status(201).json({
    success: true,
    admin: { id: admin._id, name: admin.name, username: admin.username, email: admin.email, role: admin.role, disabled: admin.disabled },
  });
}));

// Disable/enable admin
router.patch('/admins/:id/toggle', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const admin = await User.findById(req.params.id);
  if (!admin || admin.role !== 'ADMIN') return res.status(404).json({ message: 'Admin not found' });
  admin.disabled = !admin.disabled;
  await admin.save();
  res.json({ success: true, disabled: admin.disabled });
}));

router.get('/users', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const { role, q, limit } = req.query;
  const capped = Math.min(Number(limit || 50), 200);

  const filter = {};
  if (role) filter.role = role;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .select('-passwordHash')
    .sort({ createdAt: -1 })
    .limit(capped);

  res.json({ success: true, items: users });
}));

router.patch('/users/:id/toggle', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'SUPER_ADMIN') return res.status(400).json({ success: false, message: 'Cannot disable super admin' });

  user.disabled = !user.disabled;
  await user.save();
  res.json({ success: true, disabled: user.disabled });
}));

router.patch('/users/:id/role', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['ADMIN', 'CUSTOMER'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'SUPER_ADMIN') return res.status(400).json({ success: false, message: 'Cannot change super admin role' });

  user.role = role;
  await user.save();
  res.json({ success: true, role: user.role });
}));

router.delete('/users/:id', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const targetId = String(req.params.id || '');
  if (!targetId) return res.status(400).json({ success: false, message: 'Invalid user id' });

  if (req.user?._id && String(req.user._id) === targetId) {
    return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
  }

  const user = await User.findById(targetId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'SUPER_ADMIN') {
    return res.status(400).json({ success: false, message: 'Cannot delete super admin' });
  }

  await Promise.all([
    Cart.deleteOne({ userId: user._id }),
    Wishlist.deleteOne({ userId: user._id }),
    Order.updateMany({ customerId: user._id }, { $unset: { customerId: '' } }),
  ]);

  await User.deleteOne({ _id: user._id });
  return res.json({ success: true });
}));

// Seller management endpoints removed (no seller role)

// Get products with moderation status
router.get('/products', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const products = await Product.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, items: products });
}));

// Approve/reject product
router.patch('/products/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { status } = req.body; // APPROVED, REJECTED
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  product.status = status;
  await product.save();
  res.json({ success: true, status: product.status });
}));

// Get platform settings (commission only)
router.get('/settings', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = await PlatformSettings.create({});
  res.json({ success: true, item: settings });
}));

// Update platform settings (commission only)
router.patch('/settings', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const { commissionPct } = req.body;
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = new PlatformSettings();
  if (commissionPct !== undefined) settings.commissionPct = commissionPct;
  await settings.save();
  res.json({ success: true, item: settings });
}));

// One-time migration: remove legacy seller fields (no seller role)
router.post('/migrations/no-seller', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const dryRun = Boolean(req.body?.dryRun);

  const summary = {
    dryRun,
    products: {
      matched: 0,
      modified: 0,
    },
    ordersItems: {
      matched: 0,
      modified: 0,
    },
    ordersPayout: {
      matched: 0,
      modified: 0,
    },
  };

  if (dryRun) {
    summary.products.matched = await Product.countDocuments({ sellerId: { $exists: true }, createdBy: { $exists: false } });
    summary.ordersItems.matched = await Order.countDocuments({ 'items.sellerId': { $exists: true } });
    summary.ordersPayout.matched = await Order.countDocuments({ sellerPayoutAmount: { $exists: true } });
    return res.json({ success: true, summary });
  }

  const productsRes = await Product.updateMany(
    { sellerId: { $exists: true }, createdBy: { $exists: false } },
    [{ $set: { createdBy: '$sellerId' } }, { $unset: 'sellerId' }]
  );

  summary.products.matched = productsRes.matchedCount ?? productsRes.n ?? 0;
  summary.products.modified = productsRes.modifiedCount ?? productsRes.nModified ?? 0;

  const ordersItemsRes = await Order.updateMany(
    { 'items.sellerId': { $exists: true } },
    { $unset: { 'items.$[].sellerId': '' } }
  );

  summary.ordersItems.matched = ordersItemsRes.matchedCount ?? ordersItemsRes.n ?? 0;
  summary.ordersItems.modified = ordersItemsRes.modifiedCount ?? ordersItemsRes.nModified ?? 0;

  const ordersPayoutRes = await Order.updateMany(
    { sellerPayoutAmount: { $exists: true } },
    [
      { $set: { platformRevenueAmount: '$commissionAmount' } },
      { $unset: 'sellerPayoutAmount' },
    ]
  );

  summary.ordersPayout.matched = ordersPayoutRes.matchedCount ?? ordersPayoutRes.n ?? 0;
  summary.ordersPayout.modified = ordersPayoutRes.modifiedCount ?? ordersPayoutRes.nModified ?? 0;

  return res.json({ success: true, summary });
}));

module.exports = { superadminRouter: router };
