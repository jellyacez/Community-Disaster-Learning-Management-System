const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const adminMiddleware = require("../middleware/adminMiddleware");

// @route   GET /api/users
// @desc    Get all users (for admin dashboard)
// @access  Private (admin only)
router.get("/", adminMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "user"');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
