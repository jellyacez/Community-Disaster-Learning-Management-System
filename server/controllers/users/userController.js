const pool = require("../../config/db");

// @desc    Retrieves a list of authentication providers linked to the current user
// @access  Private
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
// --- End of getProviders ---

// @desc    Completes a new user's profile by saving required demographic information
// @access  Private
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
// --- End of onboarding ---

// @desc    Retrieves all registered users and their details for the admin dashboard
// @access  Private (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM "user"');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      'SELECT id, name, email, "emailVerified", image, role, "banned", "banReason", "banExpires", "createdAt", "updatedAt", "twoFactorEnabled", barangay FROM "user" ORDER BY "createdAt" DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
// --- End of getAllUsers ---
