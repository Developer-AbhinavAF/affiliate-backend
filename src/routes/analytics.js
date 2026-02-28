const router = require('express').Router();

const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { asyncHandler } = require('../utils/asyncHandler');
const { Order } = require('../models/Order');
const { Product } = require('../models/Product');
const { User } = require('../models/User');

function monthKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

router.get(
  '/superadmin/summary',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  asyncHandler(async (req, res) => {
    const [orders, productsCount, totalUsersCount] = await Promise.all([
      Order.find({}).select('grandTotal commissionAmount createdAt'),
      Product.countDocuments({}),
      User.countDocuments({}),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.grandTotal || 0), 0);
    const platformEarnings = orders.reduce((sum, o) => sum + Number(o.commissionAmount || 0), 0);
    const totalOrders = orders.length;

    const monthly = new Map();
    for (const o of orders) {
      const k = monthKey(o.createdAt);
      const prev = monthly.get(k) || { month: k, revenue: 0, earnings: 0, orders: 0 };
      prev.revenue += Number(o.grandTotal || 0);
      prev.earnings += Number(o.commissionAmount || 0);
      prev.orders += 1;
      monthly.set(k, prev);
    }

    const monthlySeries = Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      kpis: {
        totalRevenue,
        platformEarnings,
        totalOrders,
        totalProducts: productsCount,
        totalUsers: totalUsersCount,
      },
      monthly: monthlySeries,
    });
  })
);

router.get(
  '/superadmin/advanced',
  requireAuth,
  requireRole(['SUPER_ADMIN']),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 5), 25);

    const orders = await Order.find({}).select('items createdAt');
    const productIds = [];
    for (const o of orders) {
      for (const it of o.items) {
        if (it.productId) productIds.push(it.productId);
      }
    }

    const products = await Product.find({ _id: { $in: productIds } }).select('category title createdBy');
    const byProductId = new Map(products.map((p) => [p._id.toString(), p]));

    const creatorAgg = new Map();
    const productAgg = new Map();
    const categoryAgg = new Map();

    for (const o of orders) {
      for (const it of o.items) {
        const pid = it.productId?.toString?.() || '';
        const meta = byProductId.get(pid);
        const category = meta?.category || 'unknown';

        const creatorId = meta?.createdBy?.toString?.() || 'unknown';
        const revenue = Number(it.lineTotal || 0);
        const qty = Number(it.qty || 0);

        if (!creatorAgg.has(creatorId)) creatorAgg.set(creatorId, { creatorId, revenue: 0, items: 0 });
        const cAgg = creatorAgg.get(creatorId);
        cAgg.revenue += revenue;
        cAgg.items += qty;

        if (!productAgg.has(pid)) {
          productAgg.set(pid, { productId: pid, title: it.title || meta?.title || '', revenue: 0, qty: 0, category });
        }
        const p = productAgg.get(pid);
        p.revenue += revenue;
        p.qty += qty;

        if (!categoryAgg.has(category)) categoryAgg.set(category, { category, revenue: 0, qty: 0 });
        const c = categoryAgg.get(category);
        c.revenue += revenue;
        c.qty += qty;
      }
    }

    const creatorIds = Array.from(creatorAgg.keys()).filter((x) => x !== 'unknown');
    const creators = await User.find({ _id: { $in: creatorIds } }).select('name email role');
    const byCreatorId = new Map(creators.map((u) => [u._id.toString(), u]));

    const topCreators = Array.from(creatorAgg.values())
      .map((c) => ({
        ...c,
        name: byCreatorId.get(c.creatorId)?.name || 'Unknown',
        email: byCreatorId.get(c.creatorId)?.email || '',
        role: byCreatorId.get(c.creatorId)?.role || '',
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    const topProducts = Array.from(productAgg.values())
      .filter((p) => p.productId)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    const categories = Array.from(categoryAgg.values()).sort((a, b) => b.revenue - a.revenue);

    res.json({
      success: true,
      topCreators,
      topProducts,
      categories,
    });
  })
);

router.get(
  '/admin/summary',
  requireAuth,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const [pendingProducts, orders] = await Promise.all([
      Product.countDocuments({ status: 'PENDING_APPROVAL' }),
      Order.find({}).select('status createdAt'),
    ]);

    const byStatus = orders.reduce(
      (acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      },
      { PLACED: 0, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 }
    );

    const monthly = new Map();
    for (const o of orders) {
      const k = monthKey(o.createdAt);
      const prev = monthly.get(k) || { month: k, orders: 0 };
      prev.orders += 1;
      monthly.set(k, prev);
    }

    const monthlySeries = Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      kpis: {
        pendingProducts,
        totalOrders: orders.length,
        ordersByStatus: byStatus,
      },
      monthly: monthlySeries,
    });
  })
);

module.exports = { analyticsRouter: router };
