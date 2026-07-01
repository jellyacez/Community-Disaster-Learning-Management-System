const express = require("express");
const router = express.Router();
const adminController = require("../../controllers/admin/adminController");
const adminMiddleware = require("../../middleware/adminMiddleware");

// Existing routes
// @route   PUT /api/admin/users/:id
// @desc    Update a user
// @access  Private (admin only)
router.put("/users/:id", adminMiddleware, adminController.updateUser);

// @route   PUT /api/admin/users/:id/password
// @desc    Reset user password (admin only)
// @access  Private (admin only)
router.put("/users/:id/password", adminMiddleware, adminController.resetUserPassword);

// System Admin specific routes
// @route   GET /api/admin/stats
// @desc    Get system-wide statistics
// @access  Private (system_admin only)
router.get("/stats", adminMiddleware, adminController.getSystemStats);

// @route   GET /api/admin/activity-log
// @desc    Get paginated activity log
// @access  Private (system_admin only)
router.get("/activity-log", adminMiddleware, adminController.getActivityLog);

// @route   PATCH /api/admin/users/:id/role
// @desc    Update a user's role
// @access  Private (system_admin only)
router.patch("/users/:id/role", adminMiddleware, adminController.updateUserRole);

// @route   PATCH /api/admin/users/:id/ban
// @desc    Ban a user
// @access  Private (system_admin only)
router.patch("/users/:id/ban", adminMiddleware, adminController.banUser);

// @route   PATCH /api/admin/users/:id/unban
// @desc    Unban a user
// @access  Private (system_admin only)
router.patch("/users/:id/unban", adminMiddleware, adminController.unbanUser);

// @route   PATCH /api/admin/users/:id/archive
// @desc    Archive or unarchive a user
// @access  Private (system_admin only)
router.patch("/users/:id/archive", adminMiddleware, adminController.archiveUser);

// @route   PATCH /api/admin/users/bulk-archive
// @desc    Bulk archive users
// @access  Private (system_admin only)
router.patch("/users/bulk-archive", adminMiddleware, adminController.bulkArchiveUsers);

// @route   GET /api/admin/settings
// @desc    Get system settings
// @access  Private (system_admin only)
router.get("/settings", adminMiddleware, adminController.getSystemSettings);

// @route   PATCH /api/admin/settings/maintenance
// @desc    Toggle maintenance mode
// @access  Private (system_admin only)
router.patch("/settings/maintenance", adminMiddleware, adminController.setMaintenanceMode);

// @route   GET /api/admin/health
// @desc    Get system health status
// @access  Private (system_admin only)
router.get("/health", adminMiddleware, adminController.getHealthStatus);

module.exports = router;
