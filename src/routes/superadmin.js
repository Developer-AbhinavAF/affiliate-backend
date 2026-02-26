const express = require('express');
const bcrypt = require('bcryptjs');

const { User } = require('../models/User');
const { Product } = require('../models/Product');
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

// Get all sellers with status
router.get('/sellers', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { sellerStatus: status } : {};
  const sellers = await User.find({ role: 'SELLER', ...filter }).select('-passwordHash').sort({ createdAt: -1 });
  res.json({ success: true, items: sellers });
}));

// Approve/suspend seller
router.patch('/sellers/:id/status', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { status } = req.body; // APPROVED, REJECTED, SUSPENDED
  const seller = await User.findById(req.params.id);
  if (!seller || seller.role !== 'SELLER') return res.status(404).json({ message: 'Seller not found' });
  seller.sellerStatus = status;
  await seller.save();
  res.json({ success: true, sellerStatus: seller.sellerStatus });
}));

// Get products with moderation status
router.get('/products', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};
  const products = await Product.find(filter).populate('sellerId', 'name email').sort({ createdAt: -1 });
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

// Get platform settings
router.get('/settings', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = await PlatformSettings.create({});
  res.json({ success: true, item: settings });
}));

// Update platform settings
router.patch('/settings', requireAuth, requireRole(['SUPER_ADMIN']), asyncHandler(async (req, res) => {
  const { commissionPct } = req.body;
  let settings = await PlatformSettings.findOne();
  if (!settings) settings = new PlatformSettings();
  if (commissionPct !== undefined) settings.commissionPct = commissionPct;
  await settings.save();
  res.json({ success: true, item: settings });
}));

module.exports = { superadminRouter: router };
