const pool = require('../config/db');

// Cache blocked IPs in memory to avoid querying the DB on every single request
let blockedIpsCache = new Set();
let lastCacheTime = 0;
const CACHE_TTL = 30000; // 30 seconds

const ipBlocklistMiddleware = async (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  // Normalize IPv6 localhost to IPv4 if needed
  const normalizedIp = clientIp === '::1' ? '127.0.0.1' : clientIp;
  
  try {
    const now = Date.now();
    
    // Refresh cache periodically
    if (now - lastCacheTime > CACHE_TTL) {
      const result = await pool.query(`SELECT ip_address FROM public.blocked_ips`);
      blockedIpsCache = new Set(result.rows.map(row => row.ip_address));
      lastCacheTime = now;
    }
    
    if (blockedIpsCache.has(normalizedIp) || blockedIpsCache.has(clientIp)) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'Access denied. Your IP address has been blocked.'
      });
    }
  } catch (err) {
    console.error("IP Blocklist check error:", err.message);
  }
  
  return next();
};

module.exports = ipBlocklistMiddleware;
