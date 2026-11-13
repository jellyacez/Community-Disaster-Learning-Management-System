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

// Mounted on /api/auth/* in server.js, so new better-auth endpoints are covered without path matching.
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
  max: process.env.NODE_ENV === 'development' ? 1000 : 200,
  keyGenerator: (req) => {
    // keyed by user ID, not IP, so shared NATs aren't throttled together and a compromised account is tracked
    if (req.user?.id) return String(req.user.id);

    // ipKeyGenerator normalizes IPv6 so the limit can't be dodged by varying the address
    return `anon_${ipKeyGenerator(req.ip)}`;
  },
  message: {
    error: "Too many requests to admin data endpoints, please try again later.",
  },
});

const adminWriteLimiter = rateLimit({
  store: new PostgresStore(dbConfig, "admin_write_"),
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    if (req.user?.id) return String(req.user.id);
    return `anon_${ipKeyGenerator(req.ip)}`;
  },
  message: { error: "Too many admin requests, please try again later." },
});

const destructiveActionLimiter = rateLimit({
  store: new PostgresStore(dbConfig, "destructive_action_"),
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    if (req.user?.id) return String(req.user.id);
    return `anon_${ipKeyGenerator(req.ip)}`;
  },
  message: { error: "Too many destructive requests, please try again later." },
});

const certificateVerifyLimiter = rateLimit({
  store: new PostgresStore(dbConfig, "cert_verify_"),
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    if (req.user?.id) return 500;
    return 50;
  },
  keyGenerator: (req) => {
    if (req.user?.id) return `admin_${req.user.id}`;
    return `anon_${ipKeyGenerator(req.ip)}`;
  },
  message: {
    error: "Too many requests to this endpoint, please try again later.",
  },
});

module.exports = {
  authRateLimiter,
  globalLimiter,
  adminDataLimiter,
  adminWriteLimiter,
  destructiveActionLimiter,
  certificateVerifyLimiter,
};
