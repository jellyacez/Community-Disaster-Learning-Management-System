const rateLimit = require("express-rate-limit");

// @desc    Limits failed login/auth attempts to prevent brute force
// @access  Public (Auth routes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    error: "Too many login attempts from this IP, please try again later.",
  },
});

const authRateLimiter = (req, res, next) => {
  const path = req.path.toLowerCase();
  if (
    path.includes("sign-in") ||
    path.includes("sign-up") ||
    path.includes("forget-password") ||
    path.includes("request-password-reset") ||
    path.includes("reset-password") ||
    path.includes("change-password")
  ) {
    return authLimiter(req, res, next);
  }
  next();
};

// @desc    Global rate limiter for general API routes to prevent spam
// @access  Public
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests from this IP, please try again later." },
});

module.exports = {
  authRateLimiter,
  globalLimiter,
};
