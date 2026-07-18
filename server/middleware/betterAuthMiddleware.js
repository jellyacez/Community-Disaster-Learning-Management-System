const { auth } = require("../utils/auth");
const pool = require("../config/db");
const { logError } = require("../utils/logger");

// @desc    Protects routes, verifies sessions, and enforces MFA for admin roles
// @access  Private
const betterAuthMiddleware = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (session.user.archived) {
      return res.status(403).json({ error: "FORBIDDEN", message: "This account has been archived. Please contact an administrator." });
    }
    const adminRoles = ["system_admin", "mdrrmo_admin", "barangay_admin"];
    const mfaBypass = process.env.DISABLE_MFA === "true" && ["development", "test", "staging"].includes(process.env.NODE_ENV);
    if (adminRoles.includes(session.user.role) && !session.user.twoFactorEnabled && !mfaBypass) {
      return res.status(403).json({ error: "MFA_REQUIRED", message: "Multi-Factor Authentication is mandatory for this role." });
    }

    req.user = session.user;

    // Fire-and-forget throttled update for Online Users tracking
    pool.query(`
      UPDATE "user" 
      SET last_active = NOW() 
      WHERE id = $1 
      AND (last_active IS NULL OR last_active < NOW() - INTERVAL '1 minute')
    `, [session.user.id]).catch(err => console.error("Online tracking err:", err.message));

    next();
  } catch (error) {
    logError('auth_middleware_failure', {
      route: req.originalUrl,
      method: req.method,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  betterAuthMiddleware,
};
