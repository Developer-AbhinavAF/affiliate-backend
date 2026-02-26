const { PlatformSettings } = require('../models/PlatformSettings');

const ALLOWLIST_PREFIXES = ['/api/health', '/api/auth'];

async function maintenanceMiddleware(req, res, next) {
  try {
    const path = req.path || '';
    if (!path.startsWith('/api')) return next();
    if (ALLOWLIST_PREFIXES.some((p) => path.startsWith(p))) return next();

    const settings = await PlatformSettings.findOne({}).select('maintenanceEnabled maintenanceMessage');
    if (!settings || !settings.maintenanceEnabled) return next();

    if (path.startsWith('/api/superadmin')) return next();

    return res.status(503).json({
      success: false,
      message: settings.maintenanceMessage || 'Maintenance in progress. Please try again later.',
    });
  } catch {
    return next();
  }
}

module.exports = { maintenanceMiddleware };
