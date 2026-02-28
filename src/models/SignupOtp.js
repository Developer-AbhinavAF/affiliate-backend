const mongoose = require('mongoose');

const signupOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    otpHash: { type: String, required: true },
    expiryTime: { type: Date, required: true },
    attemptCount: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    ipAddress: { type: String, default: '', index: true },
    used: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

signupOtpSchema.index({ expiryTime: 1 }, { expireAfterSeconds: 0 });

const SignupOtp = mongoose.model('SignupOtp', signupOtpSchema);

module.exports = { SignupOtp };
