const { auth } = require("../utils/auth");

// @desc    Verifies session and ensures the user has the system_admin role
// @access  Private (admin only)
const adminMiddleware = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || session.user.role !== "system_admin") {
      return res.status(403).json({ error: "Forbidden: System Admins Only" });
    }
    const mfaBypass = process.env.DISABLE_MFA === "true";
    if (!session.user.twoFactorEnabled && !mfaBypass) {
      return res.status(403).json({ error: "MFA_REQUIRED", message: "Multi-Factor Authentication is mandatory." });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = adminMiddleware;
