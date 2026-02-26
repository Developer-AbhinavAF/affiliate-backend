const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
    line1: { type: String, default: '' },
    line2: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: 'IN' },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, default: '', trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'SELLER', 'CUSTOMER'],
      default: 'CUSTOMER',
      index: true,
    },
    disabled: { type: Boolean, default: false, index: true },
    sellerStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'],
      default: 'NONE',
      index: true,
    },
    phone: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = { User };
