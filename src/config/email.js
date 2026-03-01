const nodemailer = require('nodemailer');

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
const { RESEND_API_KEY, RESEND_FROM } = process.env;
const { BREVO_API_KEY, BREVO_FROM, BREVO_FROM_NAME } = process.env;

const SUPPORT_INBOX = 'abhinavdeveloper6@gmail.com';

let transporter = null;

const sanitizedPass = (SMTP_PASS || '').replace(/\s+/g, '');

if (SMTP_HOST && SMTP_PORT && SMTP_USER && sanitizedPass) {
  const hostLower = String(SMTP_HOST || '').toLowerCase();
  const portNum = Number(SMTP_PORT);
  const isGmail = hostLower === 'gmail' || hostLower.includes('gmail');

  transporter = isGmail
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: SMTP_USER, pass: sanitizedPass },
      })
    : nodemailer.createTransport({
        host: SMTP_HOST,
        port: portNum,
        secure: portNum === 465,
        auth: {
          user: SMTP_USER,
          pass: sanitizedPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

  transporter
    .verify()
    .then(() => console.log('SMTP transporter verified'))
    .catch((e) => console.error('SMTP transporter verify failed', e));
}

async function sendResendEmail({ to, subject, text }) {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!RESEND_FROM) {
    throw new Error('RESEND_FROM is not configured');
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      subject,
      text,
    }),
  });

  if (!resp.ok) {
    let details = '';
    try {
      details = await resp.text();
    } catch {
      details = '';
    }
    throw new Error(`Resend email failed: ${resp.status} ${details}`);
  }
}

async function sendBrevoEmail({ to, subject, text, replyTo }) {
  if (!BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not configured');
  }
  if (!BREVO_FROM) {
    throw new Error('BREVO_FROM is not configured');
  }

  const senderName = (BREVO_FROM_NAME && String(BREVO_FROM_NAME).trim()) || 'TrendKart';
  const replyToEmail = replyTo ? String(replyTo).trim() : '';

  const body = {
    sender: {
      name: senderName,
      email: String(BREVO_FROM).trim(),
    },
    to: Array.isArray(to)
      ? to.map((email) => ({ email: String(email).trim() }))
      : [{ email: String(to).trim() }],
    subject,
    textContent: text,
  };

  if (replyToEmail) {
    body.replyTo = { email: replyToEmail };
  }

  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    let details = '';
    try {
      details = await resp.text();
    } catch {
      details = '';
    }
    throw new Error(`Brevo email failed: ${resp.status} ${details}`);
  }
}

async function sendOtpEmail(to, code) {
  if (BREVO_API_KEY) {
    await sendBrevoEmail({
      to,
      subject: 'Password Reset OTP - TrendKart',
      text: `Hello,\n\nYour OTP for password reset is: ${code}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nSupport Team`,
    });
    return;
  }

  if (RESEND_API_KEY) {
    await sendResendEmail({
      to,
      subject: 'Password Reset OTP - TrendKart',
      text: `Hello,\n\nYour OTP for password reset is: ${code}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nSupport Team`,
    });
    return;
  }

  if (!transporter) throw new Error('SMTP is not configured');

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
  if (BREVO_API_KEY) {
    await sendBrevoEmail({
      to,
      subject: 'Verify your email - TrendKart',
      text: `Hello,\n\nYour OTP to verify your TrendKart account is: ${code}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nSupport Team`,
    });
    return;
  }

  if (RESEND_API_KEY) {
    await sendResendEmail({
      to,
      subject: 'Verify your email - TrendKart',
      text: `Hello,\n\nYour OTP to verify your TrendKart account is: ${code}\n\nThis OTP is valid for 5 minutes.\n\nIf you did not request this, please ignore this email.\n\nRegards,\nSupport Team`,
    });
    return;
  }

  if (!transporter) throw new Error('SMTP is not configured');

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

  if (BREVO_API_KEY) {
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

    await sendBrevoEmail({
      to: SUPPORT_INBOX,
      subject,
      text: lines.join('\n'),
      replyTo: cleanEmail || undefined,
    });
    return;
  }

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

