const express = require("express");
const router = express.Router();
const userController = require("../../controllers/users/userController");
const announcementController = require("../../controllers/users/announcementController");
const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const { authenticate } = require("../../middleware/authenticate");
const requirePermission = require("../../middleware/requirePermission");

// @route   GET /api/users/me/provider
// @desc    Get current user's auth providers
// @access  Private
router.get("/me/provider", authenticate, userController.getProviders);

// @route   POST /api/users/onboarding
// @desc    Complete user profile after Google OAuth
// @access  Private
router.post("/onboarding", authenticate, userController.onboarding);

// @route   GET /api/users/announcements
// @desc    Get paginated announcements
// @access  Private
router.get("/announcements", authenticate, announcementController.getPaginatedAnnouncements);

// @route   GET /api/users
// @desc    Get all users (for admin dashboard)
// @access  Private (admin only)
router.get("/", authenticate, requireRole(ADMIN_ROLES), requirePermission('view_users'), userController.getAllUsers);

// @route   DELETE /api/users/me
// @desc    Hard delete the current user's account (Right to Be Forgotten)
// @access  Private
router.delete("/me", authenticate, userController.deleteAccount);

// @route   GET /api/users/certificates/:token
// @desc    Get certificate data for the current user
// @access  Private
router.get("/certificates/:token", authenticate, userController.getCertificateData);

// @route   GET /api/users/me/export
// @desc    Export current user's data
// @access  Private
router.get("/me/export", authenticate, userController.exportUserData);

// @route   GET /api/users/me/settings
// @desc    Get user's notification settings
// @access  Private
router.get("/me/settings", authenticate, userController.getUserSettings);

// @route   PUT /api/users/me/settings
// @desc    Update user's notification settings
// @access  Private
router.put("/me/settings", authenticate, userController.updateUserSettings);

module.exports = router;
