const { ROLE_PERMISSIONS } = require("../config/permissions");

// @desc    Ensures the authenticated user has the specified granular permission
// @access  Used after authentication middleware (e.g., adminMiddleware)
const requirePermission = (permission) => {
  return (req, res, next) => {
    // Failsafe: Ensure previous middleware actually attached the user object
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Unauthorized: User session not attached." });
    }

    const userRole = req.user.role;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    console.log(`[PBAC] Checking ${permission} for role ${userRole}. Has permission? ${userPermissions.includes(permission)}`);

    if (!userPermissions.includes(permission)) {
      console.log(`[PBAC] Denied! ${userRole} missing ${permission}`);
      return res.status(403).json({ 
        error: "Forbidden", 
        message: `Missing required permission: ${permission}` 
      });
    }

    console.log(`[PBAC] Granted! Request proceeding to controller.`);
    next();
  };
};

module.exports = requirePermission;
