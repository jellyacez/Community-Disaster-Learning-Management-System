const { auth } = require("../utils/auth");

// Middleware to protect routes and attach user info to req.user
const betterAuthMiddleware = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = session.user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

module.exports = betterAuthMiddleware;
