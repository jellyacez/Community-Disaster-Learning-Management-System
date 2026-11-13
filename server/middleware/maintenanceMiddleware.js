const pool = require('../config/db');

// Cache maintenance status to reduce DB load
let cachedMaintenanceMode = null;
let lastCacheTime = 0;
const CACHE_TTL = 15000; // 15 seconds

const isMaintenanceActive = async () => {
  const now = Date.now();
  if (now - lastCacheTime > CACHE_TTL || cachedMaintenanceMode === null) {
    try {
      const result = await pool.query(
        `SELECT value FROM public.system_settings WHERE key = 'maintenance_mode'`
      );
      if (result.rows.length > 0) {
        cachedMaintenanceMode = result.rows[0].value === 'true';
      } else {
        cachedMaintenanceMode = false;
      }
      lastCacheTime = now;
    } catch (e) {
      console.error("Maintenance check error:", e.message);
      return false;
    }
  }
  return cachedMaintenanceMode;
};

const clearMaintenanceCache = () => {
  cachedMaintenanceMode = null;
  lastCacheTime = 0;
};

const maintenanceMiddleware = async (req, res, next) => {
  // stays reachable during maintenance: auth (so admins can sign in), public reads, certificates, notification SSE
  if (
    req.originalUrl.startsWith('/api/auth') ||
    req.originalUrl.startsWith('/api/public') ||
    req.originalUrl.startsWith('/api/certificates') ||
    req.originalUrl.startsWith('/api/notif')
  ) {
    return next();
  }

  // admin routes go through; the admin router enforces system_admin
  if (req.originalUrl.startsWith('/api/admin')) {
    return next();
  }
  
  try {
    const isMaintenance = await isMaintenanceActive();

    if (isMaintenance) {
      return res.status(503).json({
        success: false,
        error: 'MAINTENANCE_MODE',
        message: 'The system is currently under maintenance. Please try again later.'
      });
    }
  } catch (e) {
    console.error("Maintenance check error:", e.message);
  }
  return next();
};

maintenanceMiddleware.isMaintenanceActive = isMaintenanceActive;
maintenanceMiddleware.clearMaintenanceCache = clearMaintenanceCache;

module.exports = maintenanceMiddleware;
