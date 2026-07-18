const { auth } = require("../utils/auth");
const pool = require("../config/db");
const { logError } = require("../utils/logger");
const { MFA_REQUIRED_ROLES } = require("../config/permissions");

// @desc    Core authentication middleware (session, archive check, MFA, activity tracking)
// @access  Public (applied to all protected routes)
const authenticate = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized. Please Log In" });
    }

    if (session.user.archived) {
      return res.status(403).json({ error: "FORBIDDEN", message: "This account has been archived. Please contact an administrator." });
    }

    // MFA Enforcement explicitly applies only to MFA_REQUIRED_ROLES subset
    if (MFA_REQUIRED_ROLES.includes(session.user.role)) {
      const mfaBypass = process.env.DISABLE_MFA === "true" && ["development", "test", "staging"].includes(process.env.NODE_ENV);
      if (!session.user.twoFactorEnabled && !mfaBypass) {
        return res.status(403).json({ error: "MFA_REQUIRED", message: "Multi-Factor Authentication is mandatory for this role." });
      }
    }

    req.user = session.user;

    // Fire-and-forget throttled update for Online Users tracking (runs for all authenticated users)
    pool.query(`
      UPDATE "user" 
      SET last_active = NOW() 
      WHERE id = $1 
      AND (last_active IS NULL OR last_active < NOW() - INTERVAL '1 minute')
    `, [session.user.id]).catch(err => {
      logError('online_tracking_failure', {
        userId: session.user.id,
        message: err.message,
        stack: err.stack
      });
    });

    next();
  } catch (error) {
    logError('authentication_middleware_failure', {
      route: req.originalUrl,
      method: req.method,
      message: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { authenticate };
