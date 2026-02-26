function requireSellerApproved(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  if (user.role !== 'SELLER') return next();
  if (user.sellerStatus !== 'APPROVED') {
    return res.status(403).json({ success: false, message: 'Seller account not approved' });
  }
  return next();
}

module.exports = { requireSellerApproved };
