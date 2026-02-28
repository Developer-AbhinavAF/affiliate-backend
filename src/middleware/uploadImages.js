const multer = require('multer');
const msc = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

// Support both default and named export shapes
const CloudinaryStorage = msc.CloudinaryStorage || msc;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function imageFileFilter(req, file, cb) {
  const cfg = cloudinary.config();
  if (!cfg?.cloud_name || !cfg?.api_key || !cfg?.api_secret) {
    return cb(new Error('Image upload is not configured on server'));
  }
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Only jpeg, png, webp images are allowed'));
  }
  return cb(null, true);
}

function createImageUploader({ folder, maxFileSizeBytes = 5 * 1024 * 1024, maxFiles = 6 }) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async () => ({
      folder,
      resource_type: 'image',
      format: 'webp',
      transformation: [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto:eco' },
      ],
    }),
  });

  const upload = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: maxFileSizeBytes,
      files: maxFiles,
    },
  });

  return upload;
}

module.exports = { createImageUploader };
