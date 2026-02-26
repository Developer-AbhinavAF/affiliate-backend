const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function imageFileFilter(req, file, cb) {
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
