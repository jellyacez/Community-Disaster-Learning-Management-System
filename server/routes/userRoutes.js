const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const adminMiddleware = require("../middleware/adminMiddleware");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");

// @route   POST /api/users/onboarding
// @desc    Complete user profile after Google OAuth
// @access  Private
router.post("/onboarding", betterAuthMiddleware, async (req, res) => {
  const { name, barangay } = req.body;
  if (!name || !barangay)
    return res.status(400).json({ error: "Name and Barangay are required" });

  try {
    await pool.query(`UPDATE "user" SET name = $1, barangay = $2 WHERE id = $3`, [
      name,
      barangay,
      req.user.id,
    ]);
    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err) {
    console.error("Onboarding error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   GET /api/users
// @desc    Get all users (for admin dashboard)
// @access  Private (admin only)
router.get("/", adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, "emailVerified", image, role, "banned", "banReason", "banExpires", "createdAt", "updatedAt", "twoFactorEnabled", barangay FROM "user"');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
