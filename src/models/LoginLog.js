const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    emailOrUsernameTried: { type: String, default: '' },
    ip: { type: String, default: '' },
    success: { type: Boolean, default: false },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);

const LoginLog = mongoose.model('LoginLog', loginLogSchema);

module.exports = { LoginLog };

