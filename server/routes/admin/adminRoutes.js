const express = require("express");
const router = express.Router();
const adminMiddleware = require("../../middleware/adminMiddleware");

const userManagementController = require("../../controllers/admin/userManagementController");
const systemStatsController = require("../../controllers/admin/systemStatsController");
const systemSettingsController = require("../../controllers/admin/systemSettingsController");
const activityLogController = require("../../controllers/admin/activityLogController");

// Existing routes
// @route   PUT /api/admin/users/:id
// @desc    Update a user
// @access  Private (admin only)
router.put("/users/:id", adminMiddleware, userManagementController.updateUser);

// @route   PUT /api/admin/users/:id/password
// @desc    Reset user password (admin only)
// @access  Private (admin only)
router.put("/users/:id/password", adminMiddleware, userManagementController.resetUserPassword);

// System Admin specific routes
// @route   GET /api/admin/stats
// @desc    Get system-wide statistics
// @access  Private (system_admin only)
router.get("/stats", adminMiddleware, systemStatsController.getSystemStats);

// @route   GET /api/admin/activity-log
// @desc    Get paginated activity log
// @access  Private (system_admin only)
router.get("/activity-log", adminMiddleware, activityLogController.getActivityLog);

// @route   PATCH /api/admin/users/:id/role
// @desc    Update a user's role
// @access  Private (system_admin only)
router.patch("/users/:id/role", adminMiddleware, userManagementController.updateUserRole);

// @route   PATCH /api/admin/users/:id/ban
// @desc    Ban a user
// @access  Private (system_admin only)
router.patch("/users/:id/ban", adminMiddleware, userManagementController.banUser);

// @route   PATCH /api/admin/users/:id/unban
// @desc    Unban a user
// @access  Private (system_admin only)
router.patch("/users/:id/unban", adminMiddleware, userManagementController.unbanUser);

// @route   PATCH /api/admin/users/:id/archive
// @desc    Archive or unarchive a user
// @access  Private (system_admin only)
router.patch("/users/:id/archive", adminMiddleware, userManagementController.archiveUser);

// @route   PATCH /api/admin/users/bulk-archive
// @desc    Bulk archive users
// @access  Private (system_admin only)
router.patch("/users/bulk-archive", adminMiddleware, userManagementController.bulkArchiveUsers);

// @route   GET /api/admin/analytics/traffic
// @desc    Get 24h traffic analytics
// @access  Private (system_admin only)
router.get("/analytics/traffic", adminMiddleware, systemStatsController.getTrafficAnalytics);

// @route   GET /api/admin/settings
// @desc    Get system settings
// @access  Private (system_admin only)
router.get("/settings", adminMiddleware, systemSettingsController.getSystemSettings);

// @route   PATCH /api/admin/settings/branding
// @desc    Update system branding (name and logo)
// @access  Private (system_admin only)
router.patch("/settings/branding", adminMiddleware, systemSettingsController.updateSystemBranding);

// @route   PATCH /api/admin/settings/maintenance
// @desc    Toggle maintenance mode
// @access  Private (system_admin only)
router.patch("/settings/maintenance", adminMiddleware, systemSettingsController.setMaintenanceMode);

// @route   PATCH /api/admin/settings/broadcast
// @desc    Update broadcast message
// @access  Private (system_admin only)
router.patch("/settings/broadcast", adminMiddleware, systemSettingsController.updateBroadcast);

const ipBlocklistController = require("../../controllers/admin/ipBlocklistController");

// @route   GET /api/admin/security/blocked-ips
router.get("/security/blocked-ips", adminMiddleware, ipBlocklistController.getBlockedIps);

// @route   POST /api/admin/security/blocked-ips
router.post("/security/blocked-ips", adminMiddleware, ipBlocklistController.addBlockedIp);

// @route   DELETE /api/admin/security/blocked-ips/:id
router.delete("/security/blocked-ips/:id", adminMiddleware, ipBlocklistController.removeBlockedIp);

// @route   GET /api/admin/health
// @desc    Get system health status
// @access  Private (system_admin only)
router.get("/health", adminMiddleware, systemStatsController.getHealthStatus);

module.exports = router;
