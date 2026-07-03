const pool = require('../config/db');

// Cache maintenance status to reduce DB load
let cachedMaintenanceMode = null;
let lastCacheTime = 0;
const CACHE_TTL = 15000; // 15 seconds

const maintenanceMiddleware = async (req, res, next) => {
  // Allow admin and auth routes through always
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/auth')) {
    return next();
  }
  
  try {
    const now = Date.now();
    
    // Check cache first
    if (now - lastCacheTime > CACHE_TTL) {
      // Cache expired or missing, fetch from DB
      const result = await pool.query(
        `SELECT value FROM public.system_settings WHERE key = 'maintenance_mode'`
      );
      
      if (result.rows.length > 0) {
        cachedMaintenanceMode = result.rows[0].value === 'true';
      } else {
        cachedMaintenanceMode = false;
      }
      
      lastCacheTime = now;
    }

    if (cachedMaintenanceMode) {
      return res.status(503).json({
        success: false,
        error: 'MAINTENANCE_MODE',
        message: 'The system is currently under maintenance. Please try again later.'
      });
    }
  } catch (e) {
    // If settings table doesn't exist yet or DB error, safely continue
    console.error("Maintenance check error:", e.message);
  }
  return next();
};

module.exports = maintenanceMiddleware;
