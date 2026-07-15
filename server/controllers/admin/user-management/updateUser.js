const pool = require("../../../config/db");

// @desc    Updates user demographic details and archived status
// @access  Private (admin only)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, archived } = req.body;
  
  // M-4 FIX: Use a proper RFC-5322 compatible regex instead of the weak includes("@") check.
  // The old check accepted malformed emails like "a@", "@b", and "@@".
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email || !emailRegex.test(email)) {
    return res.status(400).json({ error: "Valid name and email are required." });
  }

  try {
    const result = await pool.query(
      'UPDATE "user" SET name = $1, email = $2, archived = $3 WHERE id = $4 RETURNING id, name, email, "emailVerified", image, role, "banned", "banReason", "banExpires", "createdAt", "updatedAt", "twoFactorEnabled", barangay, archived',
      [name, email, archived, id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });
      
    require('../../../utils/logger').logActivity(req.user.id, `Updated details for user ${email}`);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};
