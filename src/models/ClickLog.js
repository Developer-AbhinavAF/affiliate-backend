const mongoose = require('mongoose');

const clickLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sourceCompany: { type: String, default: '' },
  },
  { timestamps: true }
);

const ClickLog = mongoose.model('ClickLog', clickLogSchema);

module.exports = { ClickLog };

