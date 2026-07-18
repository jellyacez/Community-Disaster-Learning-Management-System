const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { PostgresStore } = require("@acpr/rate-limit-postgresql");

const pool = require("../config/db");

const dbConfig = {
  user: pool.options.user,
  password: pool.options.password,
  host: pool.options.host,
  port: pool.options.port,
  database: pool.options.database,
};

// M-7 FIX: authRateLimiter is now a plain rate-limit middleware instance.
// It is mounted globally on the /api/auth/* path prefix in server.js, meaning
// ALL auth endpoints are covered automatically — no fragile path substring
// matching that could miss new Better Auth endpoints.
const authRateLimiter = rateLimit({
  store: new PostgresStore(dbConfig, "auth_"),
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    error: "Too many login attempts from this IP, please try again later.",
  },
});

const globalLimiter = rateLimit({
  store: new PostgresStore(dbConfig, "global_"),
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests from this IP, please try again later." },
});

const adminDataLimiter = rateLimit({
  store: new PostgresStore(dbConfig, "admin_data_"),
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    // Key by the authenticated user's ID to prevent token abuse,
    // rather than IP, to protect shared NATs and track compromised accounts.
    if (req.user?.id) return String(req.user.id);
    
    // Fallback for missing user context. Use library's native IP normalizer to prevent IPv6 bypass.
    return `anon_${ipKeyGenerator(req.ip)}`;
  },
  message: { error: "Too many requests to admin data endpoints, please try again later." },
});

module.exports = {
  authRateLimiter,
  globalLimiter,
  adminDataLimiter,
};
