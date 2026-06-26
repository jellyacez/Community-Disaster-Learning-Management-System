const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const adminMiddleware = require("../middleware/adminMiddleware");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");

// @route   GET /api/users/me/provider
// @desc    Get current user's auth providers
// @access  Private
router.get("/me/provider", betterAuthMiddleware, userController.getProviders);

// @route   POST /api/users/onboarding
// @desc    Complete user profile after Google OAuth
// @access  Private
router.post("/onboarding", betterAuthMiddleware, userController.onboarding);

// @route   GET /api/users
// @desc    Get all users (for admin dashboard)
// @access  Private (admin only)
router.get("/", adminMiddleware, userController.getAllUsers);

module.exports = router;
