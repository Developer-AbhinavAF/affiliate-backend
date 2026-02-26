const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({ success: true, status: 'ok' });
});

module.exports = { healthRouter: router };
