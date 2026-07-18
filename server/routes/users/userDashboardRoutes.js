const express = require("express");
const router = express.Router();
const userDashboardController = require("../../controllers/users/userDashboardController");
const { authenticate } = require("../../middleware/authenticate");

// @route   GET /api/dashboard
// @desc    Get user dashboard data
// @access  Private (authenticated users)
router.get("/", authenticate, userDashboardController.getDashboardData);

module.exports = router;
