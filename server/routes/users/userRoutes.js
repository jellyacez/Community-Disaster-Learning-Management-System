const express = require("express");
const router = express.Router();
const userController = require("../../controllers/users/userController");
const adminMiddleware = require("../../middleware/adminMiddleware");
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");

// @route   GET /api/users/me/provider
// @desc    Get current user's auth providers
// @access  Private
router.get("/me/provider", betterAuthMiddleware, userController.getProviders);

// @route   POST /api/users/onboarding
// @desc    Complete user profile after Google OAuth
// @access  Private
router.post("/onboarding", betterAuthMiddleware, userController.onboarding);

const requirePermission = require("../../middleware/requirePermission");

// @route   GET /api/users
// @desc    Get all users (for admin dashboard)
// @access  Private (admin only)
router.get("/", adminMiddleware, requirePermission('view_users'), userController.getAllUsers);

// @route   DELETE /api/users/me
// @desc    Hard delete the current user's account (Right to Be Forgotten)
// @access  Private
router.delete("/me", betterAuthMiddleware, userController.deleteAccount);

// @route   GET /api/users/certificate-data
// @desc    Get current user's certificate control number
// @access  Private
router.get("/certificate-data", betterAuthMiddleware, userController.getCertificateData);

module.exports = router;
