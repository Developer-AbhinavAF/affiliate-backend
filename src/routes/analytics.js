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
    const [orders, productsCount, activeSellersCount, totalUsersCount] = await Promise.all([
      Order.find({}).select('grandTotal commissionAmount createdAt'),
      Product.countDocuments({}),
      User.countDocuments({ role: 'SELLER', sellerStatus: 'APPROVED' }),
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
        activeSellers: activeSellersCount,
        totalProducts: productsCount,
        totalUsers: totalUsersCount,
      },
      monthly: monthlySeries,
    });
  })
);

router.get(
  '/admin/summary',
  requireAuth,
  requireRole(['ADMIN']),
  asyncHandler(async (req, res) => {
    const [pendingSellers, pendingProducts, orders] = await Promise.all([
      User.countDocuments({ role: 'SELLER', sellerStatus: 'PENDING' }),
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
        pendingSellers,
        pendingProducts,
        totalOrders: orders.length,
        ordersByStatus: byStatus,
      },
      monthly: monthlySeries,
    });
  })
);

router.get(
  '/seller/summary',
  requireAuth,
  requireRole(['SELLER']),
  asyncHandler(async (req, res) => {
    const sellerId = req.user._id;

    const [productsCount, orders] = await Promise.all([
      Product.countDocuments({ sellerId }),
      Order.find({ 'items.sellerId': sellerId }).select('items status createdAt commissionAmount'),
    ]);

    let grossSales = 0;
    let commissionDeducted = 0;
    for (const o of orders) {
      for (const it of o.items) {
        if (it.sellerId.toString() === sellerId.toString()) {
          grossSales += Number(it.lineTotal || 0);
        }
      }
      commissionDeducted += Number(o.commissionAmount || 0);
    }

    const monthly = new Map();
    for (const o of orders) {
      const k = monthKey(o.createdAt);
      const prev = monthly.get(k) || { month: k, sales: 0, orders: 0 };
      prev.orders += 1;

      for (const it of o.items) {
        if (it.sellerId.toString() === sellerId.toString()) {
          prev.sales += Number(it.lineTotal || 0);
        }
      }

      monthly.set(k, prev);
    }

    const monthlySeries = Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      kpis: {
        myProducts: productsCount,
        myOrders: orders.length,
        grossSales,
        commissionDeducted,
      },
      monthly: monthlySeries,
    });
  })
);

module.exports = { analyticsRouter: router };
