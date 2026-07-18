const { logError } = require("../utils/logger");

// @desc    Synchronous role checker middleware
// @access  Private
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    // This MUST run after `authenticate` which sets req.user
    if (!req.user || !req.user.role) {
      logError('role_middleware_routing_bug', {
        route: req.originalUrl,
        method: req.method,
        message: 'requireRole called without req.user. Did you forget to mount authenticate middleware?'
      });
      return res.status(401).json({ error: "Unauthorized. Missing user context." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden. You don't have permission to access this resource.",
      });
    }

    next();
  };
};

module.exports = requireRole;
