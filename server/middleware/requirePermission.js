const { ROLE_PERMISSIONS } = require("../config/permissions");

// checks a single granular permission; mount after authenticate
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Unauthorized: User session not attached." });
    }

    const userRole = req.user.role;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        error: "Forbidden", 
        message: "You do not have the required permissions to perform this action." 
      });
    }

    next();
  };
};

module.exports = requirePermission;
