const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const { User } = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (user.disabled) {
      return res.status(403).json({ success: false, message: 'Account disabled' });
    }

    req.user = user;
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

module.exports = { requireAuth };
