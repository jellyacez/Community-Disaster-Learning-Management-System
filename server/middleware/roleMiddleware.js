const { auth } = require("../utils/auth");

// @desc    Dynamic middleware to restrict routes based on an array of allowed roles
// @access  Private
const requiredRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const session = await auth.api.getSession({ headers: req.headers });

      if (!session || !session.user) {
        return res.status(401).json({ error: "Unauthorized. Please Log In" });
      }
      const userRole = session.user.role;
      const userId = session.user.id;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error:
            "Forbidden. You don't have permission to access this resource.",
        });
      }
      req.user = session.user;
      next();
    } catch (error) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
};

module.exports = requiredRole;
