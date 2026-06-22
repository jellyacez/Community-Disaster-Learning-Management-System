const { auth } = require("../utils/auth");

const adminMiddleware = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || session.user.role !== "system_admin") {
      return res.status(403).json({ error: "Forbidden: System Admins Only" });
    }
    if (!session.user.twoFactorEnabled) {
      return res.status(403).json({ error: "MFA_REQUIRED", message: "Multi-Factor Authentication is mandatory." });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = adminMiddleware;
