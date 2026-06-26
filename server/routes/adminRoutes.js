const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminMiddleware = require("../middleware/adminMiddleware");

// @route   PUT /api/admin/users/:id
// @desc    Update a user
// @access  Private (admin only)
router.put("/users/:id", adminMiddleware, adminController.updateUser);

// @route   PUT /api/admin/users/:id/password
// @desc    Reset user password (admin only)
// @access  Private (admin only)
router.put("/users/:id/password", adminMiddleware, adminController.resetUserPassword);

module.exports = router;
