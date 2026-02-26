const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { meRouter: router };
