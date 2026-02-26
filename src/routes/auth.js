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

module.exports = { authRouter: router };
