const { auth } = require("../utils/auth");
const pool = require("../config/db");

// @desc    Verifies session and ensures the user has an admin-level role
// @access  Private (system_admin, MDRRMO_admin, barangay_admin)
const ADMIN_ROLES = ["system_admin", "mdrrmo_admin", "barangay_admin"];

const adminMiddleware = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !ADMIN_ROLES.includes(session.user.role)) {
      return res.status(403).json({ error: "Forbidden: Admins Only" });
    }
    const mfaBypass = process.env.DISABLE_MFA === "true";
    if (!session.user.twoFactorEnabled && !mfaBypass) {
      return res.status(403).json({ error: "MFA_REQUIRED", message: "Multi-Factor Authentication is mandatory." });
    }

    // Fire-and-forget throttled update for Online Users tracking
    pool.query(`
      UPDATE "user" 
      SET last_active = NOW() 
      WHERE id = $1 
      AND (last_active IS NULL OR last_active < NOW() - INTERVAL '1 minute')
    `, [session.user.id]).catch(err => console.error("Admin online tracking err:", err.message));

    next();
  } catch {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = adminMiddleware;
