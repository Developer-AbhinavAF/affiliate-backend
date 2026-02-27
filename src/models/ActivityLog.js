const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, default: '' },
    action: {
      type: String,
      enum: ['PRODUCT_UPLOAD', 'PRODUCT_DELETE', 'ROLE_CHANGE', 'STOCK_UPDATE', 'COMMISSION_UPDATE'],
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = { ActivityLog };

