const mongoose = require('mongoose');

const productImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const specSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['electrical', 'supplements', 'clothes_men', 'clothes_women', 'clothes_kids'],
      index: true,
    },
    sku: { type: String, default: '', trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'INR' },
    images: { type: [productImageSchema], default: [] },
    brand: { type: String, default: '' },
    section: { type: String, default: '' },
    sourceCompany: {
      type: String,
      enum: [
        'Amazon',
        'Flipkart',
        'Myntra',
        'Ajio',
        'Shopsy',
        'Puma',
        'Acer',
        'MuscleBlaze',
        'Nutrabay',
        'HP',
        'Custom',
      ],
      default: 'Custom',
      index: true,
    },
    buyLink: { type: String, default: '' },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    specs: { type: [specSchema], default: [] },
    highlights: [{ type: String }],
    tags: [{ type: String }],
    shippingCost: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'PENDING_APPROVAL',
      index: true,
    },
    isActive: { type: Boolean, default: true },
    deliveryEtaDaysMin: { type: Number, default: 3, min: 0 },
    deliveryEtaDaysMax: { type: Number, default: 7, min: 0 },
    // analytics
    clicks: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);

module.exports = { Product };
