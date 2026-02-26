const router = require('express').Router();
const { z } = require('zod');

const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { asyncHandler } = require('../utils/asyncHandler');
const { Cart } = require('../models/Cart');
const { Order } = require('../models/Order');
const { Product } = require('../models/Product');
const { PlatformSettings } = require('../models/PlatformSettings');

async function getCommissionPct() {
  const doc = await PlatformSettings.findOne({});
  if (doc) return doc.commissionPct;
  const created = await PlatformSettings.create({});
  return created.commissionPct;
}

router.post(
  '/',
  requireAuth,
  requireRole(['CUSTOMER']),
  asyncHandler(async (req, res) => {
    const { shippingAddress } = z
      .object({
        shippingAddress: z.object({
          fullName: z.string().min(1),
          phone: z.string().min(6),
          line1: z.string().min(3),
          line2: z.string().optional().default(''),
          city: z.string().min(2),
          state: z.string().min(2),
          postalCode: z.string().min(3),
          country: z.string().min(2).default('IN'),
        }),
      })
      .parse(req.body);

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    const productIds = cart.items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true, status: 'APPROVED' });
    const byId = new Map(products.map((p) => [p._id.toString(), p]));

    const items = [];
    for (const ci of cart.items) {
      const p = byId.get(ci.productId.toString());
      if (!p) continue;
      const qty = Math.min(ci.qty, p.stock);
      if (qty <= 0) continue;

      items.push({
        productId: p._id,
        sellerId: p.sellerId,
        title: p.title,
        imageUrl: p.images?.[0]?.url || '',
        price: p.price,
        qty,
        lineTotal: Number(p.price) * qty,
      });
    }

    if (items.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid items in cart' });
    }

    const subtotal = items.reduce((sum, x) => sum + x.lineTotal, 0);
    const commissionPct = await getCommissionPct();
    const commissionAmount = (subtotal * commissionPct) / 100;
    const sellerPayoutAmount = subtotal - commissionAmount;

    const order = await Order.create({
      customerId: req.user._id,
      items,
      subtotal,
      commissionPct,
      commissionAmount,
      sellerPayoutAmount,
      grandTotal: subtotal,
      paymentMethod: 'COD',
      shippingAddress,
      status: 'PLACED',
      timeline: [{ status: 'PLACED', note: 'Order placed (COD)' }],
    });

    for (const it of items) {
      await Product.updateOne(
        { _id: it.productId, stock: { $gte: it.qty } },
        { $inc: { stock: -it.qty } }
      );
    }

    await Cart.updateOne({ userId: req.user._id }, { $set: { items: [] } });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user._id.toString()}`).emit('notification', {
        type: 'ORDER_PLACED',
        orderId: order._id,
        message: 'Your order has been placed',
      });
    }

    res.status(201).json({ success: true, orderId: order._id });
  })
);

router.get(
  '/my',
  requireAuth,
  asyncHandler(async (req, res) => {
    const orders = await Order.find({ customerId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, items: orders });
  })
);

router.get(
  '/',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'ADMIN', 'SELLER']),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 25), 200);
    const role = req.user.role;

    let filter = {};
    if (role === 'SELLER') {
      filter = { 'items.sellerId': req.user._id };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ success: true, items: orders });
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });

    const isOwner = order.customerId.toString() === req.user._id.toString();
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(req.user.role);
    const isSeller = req.user.role === 'SELLER' && order.items.some((x) => x.sellerId.toString() === req.user._id.toString());

    if (!isOwner && !isAdmin && !isSeller) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    return res.json({ success: true, item: order });
  })
);

router.patch(
  '/:id/status',
  requireAuth,
  requireRole(['SUPER_ADMIN', 'ADMIN', 'SELLER']),
  asyncHandler(async (req, res) => {
    const { status, note } = z
      .object({
        status: z.enum(['CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
        note: z.string().max(200).optional().default(''),
      })
      .parse(req.body);

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.user.role === 'SELLER') {
      const isSeller = order.items.some((x) => x.sellerId.toString() === req.user._id.toString());
      if (!isSeller) return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    order.status = status;
    order.timeline.push({ status, note });
    await order.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${order.customerId.toString()}`).emit('notification', {
        type: 'ORDER_STATUS',
        orderId: order._id,
        message: `Order status updated: ${status}`,
      });
    }

    res.json({ success: true });
  })
);

module.exports = { ordersRouter: router };
