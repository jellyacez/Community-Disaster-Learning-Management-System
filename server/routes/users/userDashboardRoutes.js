const express = require("express");
const router = express.Router();
const userDashboardController = require("../../controllers/users/userDashboardController");
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");

// @route   GET /api/dashboard
// @desc    Get user dashboard data
// @access  Private (authenticated users)
router.get("/", betterAuthMiddleware, userDashboardController.getDashboardData);

module.exports = router;
