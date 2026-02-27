const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

let transporter = null;

const sanitizedPass = (SMTP_PASS || '').replace(/\s+/g, '');

if (SMTP_HOST && SMTP_PORT && SMTP_USER && sanitizedPass) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: sanitizedPass,
    },
  });
}

async function sendOtpEmail(to, code) {
  if (!transporter) {
    console.log('OTP code (email not configured):', to, code);
    return;
  }

  // Gmail/SMTP often requires the FROM to match the authenticated mailbox.
  // If SMTP_FROM is set to a different mailbox, many providers will reject the message.
  const safeFrom = `TrendKart <${SMTP_USER}>`;
  const from = SMTP_FROM && String(SMTP_FROM).includes(String(SMTP_USER)) ? SMTP_FROM : safeFrom;

  await transporter.sendMail({
    from,
    to,
    subject: 'Password Reset OTP - TrendKart',
    text: `Hello,\n\nYour OTP for password reset is: ${code}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nSupport Team`,
  });
}

module.exports = { sendOtpEmail };

