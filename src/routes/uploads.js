const router = require('express').Router();
const { z } = require('zod');

const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const { createImageUploader } = require('../middleware/uploadImages');

const uploadProducts = createImageUploader({ folder: 'trendkart/products', maxFiles: 8 });
const uploadReviews = createImageUploader({ folder: 'trendkart/reviews', maxFiles: 6 });

function mapFiles(files) {
  return (files || []).map((f) => ({
    url: f.path,
    publicId: f.filename,
  }));
}

router.post(
  '/product-images',
  requireAuth,
  requireRole(['ADMIN']),
  uploadProducts.array('images', 8),
  (req, res) => {
    res.json({ success: true, images: mapFiles(req.files) });
  }
);

router.post(
  '/review-images',
  requireAuth,
  requireRole(['CUSTOMER']),
  uploadReviews.array('images', 6),
  (req, res) => {
    res.json({ success: true, images: mapFiles(req.files) });
  }
);

router.post('/avatar', requireAuth, uploadProducts.single('image'), (req, res) => {
  z.object({}).parse(req.body);
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'Missing image' });
  return res.json({ success: true, image: { url: file.path, publicId: file.filename } });
});

module.exports = { uploadsRouter: router };
