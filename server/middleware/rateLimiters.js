const rateLimit = require("express-rate-limit");
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

module.exports = {
  authRateLimiter,
  globalLimiter,
};
