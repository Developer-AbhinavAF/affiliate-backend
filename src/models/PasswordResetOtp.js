const mongoose = require('mongoose');

const passwordResetOtpSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    otpHash: { type: String, required: true },
    expiryTime: { type: Date, required: true },
    attemptCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    ipAddress: { type: String, default: '', index: true },
    used: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

passwordResetOtpSchema.index({ expiryTime: 1 }, { expireAfterSeconds: 0 });

const PasswordResetOtp = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);

module.exports = { PasswordResetOtp };

