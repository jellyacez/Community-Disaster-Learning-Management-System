const { auth } = require("../utils/auth");
const pool = require("../config/db");

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

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error:
            "Forbidden. You don't have permission to access this resource.",
        });
      }
      req.user = session.user;

      // Fire-and-forget throttled update for Online Users tracking
      pool.query(`
        UPDATE "user" 
        SET last_active = NOW() 
        WHERE id = $1 
        AND (last_active IS NULL OR last_active < NOW() - INTERVAL '1 minute')
      `, [session.user.id]).catch(err => console.error("Role online tracking err:", err.message));

      next();
    } catch {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
};

module.exports = requiredRole;
