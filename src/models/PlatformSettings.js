const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    commissionPct: { type: Number, default: 5, min: 0, max: 100 },
    maintenanceEnabled: { type: Boolean, default: false, index: true },
    maintenanceMessage: { type: String, default: 'Maintenance in progress. Please try again later.' },
  },
  { timestamps: true }
);

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);

module.exports = { PlatformSettings };
