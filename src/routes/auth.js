const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { User } = require('../models/User');
const { LoginLog } = require('../models/LoginLog');
const { PasswordResetOtp } = require('../models/PasswordResetOtp');
const { asyncHandler } = require('../utils/asyncHandler');
const { sendOtpEmail } = require('../config/email');

const signupSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(2).max(60).optional(),
  password: z.string().min(8).max(128),
}).refine((v) => Boolean(v.email) || Boolean(v.username), {
  message: 'email or username is required',
});

const forgotPasswordSchema = z.object({
  username: z.string().min(2).max(120),
  email: z.string().email(),
});

const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ -\/:-@\[-`\{-~]).{8,}$/;

const resetPasswordSchema = z
  .object({
    username: z.string().min(2).max(120),
    email: z.string().email(),
    code: z.string().min(4).max(12),
    newPassword: z.string().regex(passwordRegex, 'Password does not meet complexity requirements'),
  })
  .refine((v) => Boolean(v.username) && Boolean(v.email), {
    message: 'username and email are required',
  });

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), v: user.tokenVersion || 0 }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

router.post(
  '/signup',
  asyncHandler(async (req, res) => {
    const { name, email, password } = signupSchema.parse(req.body);

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: 'CUSTOMER' });
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, username, password } = loginSchema.parse(req.body);
    const identifier = (email || username || '').trim();
    const ip = req.ip;

    const user = email
      ? await User.findOne({ email })
      : await User.findOne({ $or: [{ username }, { name: username }] });
    if (!user) {
      await LoginLog.create({
        emailOrUsernameTried: identifier,
        ip,
        success: false,
        reason: 'not_found',
      });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      await LoginLog.create({
        userId: user._id,
        emailOrUsernameTried: identifier,
        ip,
        success: false,
        reason: 'locked',
      });
      return res.status(429).json({ success: false, message: 'Account locked. Try again later.' });
    }

    if (user.disabled) {
      await LoginLog.create({
        userId: user._id,
        emailOrUsernameTried: identifier,
        ip,
        success: false,
        reason: 'disabled',
      });
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.loginAttempts = 0;
      }
      await user.save();

      await LoginLog.create({
        userId: user._id,
        emailOrUsernameTried: identifier,
        ip,
        success: false,
        reason: 'wrong_password',
      });

      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = signToken(user);

    await LoginLog.create({
      userId: user._id,
      emailOrUsernameTried: identifier,
      ip,
      success: true,
      reason: 'success',
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  })
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { username, email } = forgotPasswordSchema.parse(req.body);
    const ip = req.ip || '';

    const user =
      (await User.findOne({ username })) ||
      (await User.findOne({ name: username }));

    // Generic error to avoid leaking which field is wrong
    if (!user || user.email !== email) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid username or email' });
    }

    const now = Date.now();

    const userWindowStart = new Date(now - 15 * 60 * 1000);
    const userRequests = await PasswordResetOtp.countDocuments({
      userId: user._id,
      createdAt: { $gte: userWindowStart },
    });
    if (userRequests >= 3) {
      return res
        .status(429)
        .json({ success: false, message: 'Too many OTP requests. Try again later.' });
    }

    const ipWindowStart = new Date(now - 60 * 60 * 1000);
    const ipRequests = await PasswordResetOtp.countDocuments({
      ipAddress: ip,
      createdAt: { $gte: ipWindowStart },
    });
    if (ipRequests >= 5) {
      return res
        .status(429)
        .json({ success: false, message: 'Too many reset attempts. Try again later.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = await bcrypt.hash(code, 10);

    const expiryTime = new Date(now + 5 * 60 * 1000);

    await PasswordResetOtp.create({
      userId: user._id,
      otpHash,
      expiryTime,
      attemptCount: 0,
      lockedUntil: null,
      ipAddress: ip,
      used: false,
    });

    try {
      await sendOtpEmail(user.email, code);
    } catch (e) {
      console.error('Failed to send OTP email', e);
    }

    return res.json({ success: true, message: 'OTP sent if account exists' });
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { username, email, code, newPassword } = resetPasswordSchema.parse(req.body);
    const ip = req.ip || '';

    const user =
      (await User.findOne({ username, email })) ||
      (await User.findOne({ name: username, email }));

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired code' });
    }

    const otpDoc = await PasswordResetOtp.findOne({
      userId: user._id,
      used: false,
      expiryTime: { $gte: new Date() },
    }).sort({ createdAt: -1 });

    if (!otpDoc) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired code' });
    }

    if (otpDoc.lockedUntil && otpDoc.lockedUntil.getTime() > Date.now()) {
      return res
        .status(429)
        .json({ success: false, message: 'Too many attempts. Try again later.' });
    }

    const match = await bcrypt.compare(code, otpDoc.otpHash);
    if (!match) {
      otpDoc.attemptCount = (otpDoc.attemptCount || 0) + 1;
      if (otpDoc.attemptCount >= 5) {
        otpDoc.lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
      }
      await otpDoc.save();

      return res
        .status(400)
        .json({ success: false, message: 'Invalid or expired code' });
    }

    const last3 = [user.passwordHash, ...(user.passwordHistory || []).map((h) => h.hash)].filter(Boolean).slice(0, 3);
    for (const oldHash of last3) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        return res
          .status(400)
          .json({ success: false, message: 'New password cannot match last 3 passwords' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    user.passwordHistory = [
      { hash: user.passwordHash, changedAt: new Date() },
      ...(user.passwordHistory || []),
    ].slice(0, 3);
    user.passwordHash = newHash;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    otpDoc.used = true;
    await otpDoc.save();

    return res.json({ success: true, message: 'Password reset successful' });
  })
);

module.exports = { authRouter: router };
