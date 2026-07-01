const pool = require('../config/db');

const maintenanceMiddleware = async (req, res, next) => {
  // Allow admin and auth routes through always
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) {
    return next();
  }
  try {
    const result = await pool.query(
      `SELECT value FROM public.system_settings WHERE key = 'maintenance_mode'`
    );
    if (result.rows.length > 0 && result.rows[0].value === 'true') {
      return res.status(503).json({
        success: false,
        error: 'MAINTENANCE_MODE',
        message: 'The system is currently under maintenance. Please try again later.'
      });
    }
  } catch (e) {
    // If settings table doesn't exist yet, just continue
  }
  return next();
};

module.exports = maintenanceMiddleware;
