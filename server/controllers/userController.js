const pool = require("../config/db");

// @desc    Get current user's auth providers
exports.getProviders = async (req, res) => {
  try {
    const result = await pool.query('SELECT "providerId" FROM account WHERE "userId" = $1', [req.user.id]);
    const providers = result.rows.map(r => r.providerId);
    res.json({ providers });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// @desc    Complete user profile after Google OAuth
exports.onboarding = async (req, res) => {
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
};

// @desc    Get all users (for admin dashboard)
exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, "emailVerified", image, role, "banned", "banReason", "banExpires", "createdAt", "updatedAt", "twoFactorEnabled", barangay FROM "user"');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
