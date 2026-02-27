const express = require('express');
const { User } = require('../models/User');
const { Product } = require('../models/Product');
const { Order } = require('../models/Order');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

function csvEscape(v) {
  const s = String(v ?? '');
  const needsQuotes = /[\n\r,\"]/g.test(s);
  const escaped = s.replace(/\"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function toCsv(rows, headers) {
  const head = headers.map(csvEscape).join(',');
  const body = rows
    .map((r) => headers.map((h) => csvEscape(r[h])).join(','))
    .join('\n');
  return `${head}\n${body}\n`;
}

// Export orders CSV
router.get('/orders', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('customerId', 'name email')
    .populate('items.productId', 'title')
    .sort({ createdAt: -1 });

  const rows = orders.map((o) => ({
    orderId: o._id,
    customer: o.customerId?.name || '',
    email: o.customerId?.email || '',
    grandTotal: o.grandTotal,
    status: o.status,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt.toISOString(),
  }));
  const headers = ['orderId', 'customer', 'email', 'grandTotal', 'status', 'paymentMethod', 'createdAt'];
  const csv = toCsv(rows, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  res.send(csv);
}));

// Export products CSV
router.get('/products', requireAuth, requireRole(['SUPER_ADMIN', 'ADMIN']), asyncHandler(async (req, res) => {
  const products = await Product.find()
    .populate('sellerId', 'name email')
    .sort({ createdAt: -1 });

  const rows = products.map((p) => ({
    productId: p._id,
    title: p.title,
    seller: p.sellerId?.name || '',
    email: p.sellerId?.email || '',
    price: p.price,
    stock: p.stock,
    status: p.status,
    createdAt: p.createdAt.toISOString(),
  }));
  const headers = ['productId', 'title', 'seller', 'email', 'price', 'stock', 'status', 'createdAt'];
  const csv = toCsv(rows, headers);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="products.csv"');
  res.send(csv);
}));

module.exports = { reportsRouter: router };
