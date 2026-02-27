const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { User } = require('../models/User');
const { asyncHandler } = require('../utils/asyncHandler');

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
  emailOrUsername: z.string().min(2).max(120),
});

const resetPasswordSchema = z.object({
  emailOrUsername: z.string().min(2).max(120),
  code: z.string().min(4).max(12),
  newPassword: z.string().min(8).max(128),
});

function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
    const user = await User.create({ name, email, passwordHash, role: 'CUSTOMER', sellerStatus: 'NONE' });
    const token = signToken(user._id.toString());

    return res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, sellerStatus: user.sellerStatus },
    });
  })
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, username, password } = loginSchema.parse(req.body);

    const user = email
      ? await User.findOne({ email })
      : await User.findOne({ $or: [{ username }, { name: username }] });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.disabled) {
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken(user._id.toString());

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        sellerStatus: user.sellerStatus,
      },
    });
  })
);

router.post(
  '/forgot-password',
  asyncHandler(async (req, res) => {
    const { emailOrUsername } = forgotPasswordSchema.parse(req.body);

    const user =
      (await User.findOne({ email: emailOrUsername })) ||
      (await User.findOne({ username: emailOrUsername })) ||
      (await User.findOne({ name: emailOrUsername }));

    // To prevent account enumeration, always respond success even if not found
    if (!user) {
      return res.json({ success: true, message: 'If an account exists, an OTP has been generated.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.resetPasswordCode = code;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // In a real app, send code via email/SMS here
    // For now, log it so it can be retrieved from server logs during development
    console.log('Password reset OTP for', user.email, 'is', code);

    return res.json({ success: true, message: 'If an account exists, an OTP has been generated.' });
  })
);

router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const { emailOrUsername, code, newPassword } = resetPasswordSchema.parse(req.body);

    const user =
      (await User.findOne({ email: emailOrUsername })) ||
      (await User.findOne({ username: emailOrUsername })) ||
      (await User.findOne({ name: emailOrUsername }));

    if (
      !user ||
      !user.resetPasswordCode ||
      user.resetPasswordCode !== code ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ success: true, message: 'Password reset successful' });
  })
);

module.exports = { authRouter: router };
