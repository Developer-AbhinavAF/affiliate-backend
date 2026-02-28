const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

const SUPPORT_INBOX = 'abhinavdeveloper6@gmail.com';

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

async function sendSignupOtpEmail(to, code) {
  if (!transporter) {
    console.log('Signup OTP (email not configured):', to, code);
    return;
  }

  const safeFrom = `TrendKart <${SMTP_USER}>`;
  const from = SMTP_FROM && String(SMTP_FROM).includes(String(SMTP_USER)) ? SMTP_FROM : safeFrom;

  await transporter.sendMail({
    from,
    to,
    subject: 'Verify your email - TrendKart',
    text: `Hello,\n\nYour OTP to verify your TrendKart account is: ${code}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nSupport Team`,
  });
}

function safeText(v) {
  return String(v || '').replace(/\r/g, '').trim();
}

async function sendSupportQuestionEmail({ name, email, message, productId, productTitle, pageUrl }) {
  const cleanName = safeText(name);
  const cleanEmail = safeText(email);
  const cleanMsg = safeText(message);
  const cleanProductTitle = safeText(productTitle);
  const cleanProductId = safeText(productId);
  const cleanPageUrl = safeText(pageUrl);

  if (!transporter) {
    console.log('Support question (email not configured):', {
      to: SUPPORT_INBOX,
      name: cleanName,
      email: cleanEmail,
      productId: cleanProductId,
      productTitle: cleanProductTitle,
      pageUrl: cleanPageUrl,
      message: cleanMsg,
    });
    return;
  }

  const safeFrom = `TrendKart <${SMTP_USER}>`;
  const from = SMTP_FROM && String(SMTP_FROM).includes(String(SMTP_USER)) ? SMTP_FROM : safeFrom;

  const subjectBits = ['New Customer Question'];
  if (cleanProductTitle) subjectBits.push(cleanProductTitle);
  const subject = `${subjectBits.join(' - ')} | TrendKart`;

  const lines = [
    'A customer has asked a question.',
    '',
    `Name: ${cleanName || '—'}`,
    `Email: ${cleanEmail || '—'}`,
    cleanProductId ? `Product ID: ${cleanProductId}` : null,
    cleanProductTitle ? `Product: ${cleanProductTitle}` : null,
    cleanPageUrl ? `Page: ${cleanPageUrl}` : null,
    '',
    'Message:',
    cleanMsg || '—',
  ].filter(Boolean);

  await transporter.sendMail({
    from,
    to: SUPPORT_INBOX,
    replyTo: cleanEmail || undefined,
    subject,
    text: lines.join('\n'),
  });
}

module.exports = { sendOtpEmail, sendSignupOtpEmail, sendSupportQuestionEmail };

