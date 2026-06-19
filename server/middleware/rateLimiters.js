const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: {
    error: "Too many login attempts from this IP, please try again later.",
  },
});

const authRateLimiter = (req, res, next) => {
  if (
    req.path.includes("sign-in") ||
    req.path.includes("sign-up") ||
    req.path.includes("forget-password")
  ) {
    return authLimiter(req, res, next);
  }
  next();
};

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests from this IP, please try again later." },
});

module.exports = {
  authRateLimiter,
  globalLimiter,
};
