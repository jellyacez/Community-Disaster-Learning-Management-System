const express = require("express");
const router = express.Router();
const userController = require("../../controllers/users/userController");
const announcementController = require("../../controllers/users/announcementController");
const userSettingsController = require("../../controllers/users/userSettingsController");
const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const { authenticate } = require("../../middleware/authenticate");
const requirePermission = require("../../middleware/requirePermission");

// @route   GET /api/users/me/provider
router.get("/me/provider", authenticate, userController.getProviders);


// @route   POST /api/users/onboarding
// @desc    Complete user profile after Google OAuth
router.post("/onboarding", authenticate, userController.onboarding);

// @route   GET /api/users/announcements
router.get("/announcements", authenticate, announcementController.getPaginatedAnnouncements);


// @route   GET /api/users
router.get("/", authenticate, requireRole(ADMIN_ROLES), requirePermission('view_users'), userController.getAllUsers);

// @route   DELETE /api/users/me
// @desc    Hard delete the current user's account (Right to Be Forgotten)
router.delete("/me", authenticate, userController.deleteAccount);

// @route   GET /api/users/certificates/:token
router.get("/certificates/:token", authenticate, userController.getCertificateData);

// @route   GET /api/users/me/export
router.get("/me/export", authenticate, userController.exportUserData);

// @route   GET /api/users/me/settings
router.get("/me/settings", authenticate, userController.getUserSettings);

// @route   PUT /api/users/me/settings
router.put("/me/settings", authenticate, userController.updateUserSettings);

// @route   GET /api/users/me/notifications
router.get("/me/notifications", authenticate, userController.getNotifications);

// @route   PATCH /api/users/me/notifications/read
router.patch("/me/notifications/read", authenticate, userController.markNotificationsRead);

// @route   GET /api/users/me/sessions
router.get("/me/sessions", authenticate, userSettingsController.getUserSessions);

module.exports = router;
