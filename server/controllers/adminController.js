const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { auth } = require("../utils/auth");
const adminMiddleware = require("../middleware/adminMiddleware");

// @route   GET /api/admin/users
// @desc    Get all users (for admin dashboard)
// @access  Private (admin only)
router.put("/users/:id", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, email, archived } = req.body;
  try {
    const result = await pool.query(
      'UPDATE "user" SET name = $1, email = $2, archived = $3 WHERE id = $4 RETURNING *',
      [name, email, archived, id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

// @route   PUT /api/admin/users/:id/password
// @desc    Reset user password (admin only)
// @access  Private (admin only)
router.put("/users/:id/password", adminMiddleware, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters" });
  }
  try {
    await auth.api.setUserPassword({
      headers: req.headers,
      body: {
        userId: id,
        password: password
      }
    });
    
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
