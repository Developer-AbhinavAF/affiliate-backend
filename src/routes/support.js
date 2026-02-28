const express = require('express');
const { z } = require('zod');

const { asyncHandler } = require('../utils/asyncHandler');
const { sendSupportQuestionEmail } = require('../config/email');

const router = express.Router();

const questionSchema = z.object({
  name: z.string().min(2).max(60).optional().default(''),
  email: z.string().email().optional().default(''),
  message: z.string().min(2).max(2000),
  productId: z.string().min(1).optional().default(''),
  productTitle: z.string().min(1).max(200).optional().default(''),
  pageUrl: z.string().url().optional().default(''),
});

router.post(
  '/questions',
  asyncHandler(async (req, res) => {
    const payload = questionSchema.parse(req.body);

    await sendSupportQuestionEmail(payload);

    return res.json({ success: true, message: 'Sent' });
  })
);

module.exports = { supportRouter: router };
