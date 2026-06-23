const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { auth } = require("../utils/auth");
const { authRateLimiter } = require("../middleware/rateLimiters");
const {
  passwordChangeInterceptor,
  passwordResetInterceptor,
  loginAlertInterceptor,
} = require("../middleware/securityInterceptors");

router.post("/change-password", passwordChangeInterceptor);
router.post("/reset-password", passwordResetInterceptor);
router.post("/sign-in/email", loginAlertInterceptor);

router.post("/enable-email-mfa", async (req, res) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    
    await pool.query('UPDATE "user" SET "twoFactorEnabled" = true WHERE id = $1', [session.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to enable email MFA:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
