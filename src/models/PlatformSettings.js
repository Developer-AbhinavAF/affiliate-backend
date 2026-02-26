const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    commissionPct: { type: Number, default: 5, min: 0, max: 100 },
  },
  { timestamps: true }
);

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);

module.exports = { PlatformSettings };
