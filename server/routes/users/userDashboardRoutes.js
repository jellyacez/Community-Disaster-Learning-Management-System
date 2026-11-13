const express = require("express");
const router = express.Router();
const userDashboardController = require("../../controllers/users/userDashboardController");
const { authenticate } = require("../../middleware/authenticate");

// @route   GET /api/user/dashboard
router.get("/", authenticate, userDashboardController.getDashboardData);

module.exports = router;
