const { auth } = require("../utils/auth");

// @desc    Protects routes, verifies sessions, and enforces MFA for admin roles
// @access  Private
const betterAuthMiddleware = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const adminRoles = ["system_admin", "mdrrmo_admin", "barangay_admin"];
    const mfaBypass = process.env.DISABLE_MFA === "true";
    if (adminRoles.includes(session.user.role) && !session.user.twoFactorEnabled && !mfaBypass) {
      return res.status(403).json({ error: "MFA_REQUIRED", message: "Multi-Factor Authentication is mandatory for this role." });
    }

    req.user = session.user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = {
  betterAuthMiddleware,
};
