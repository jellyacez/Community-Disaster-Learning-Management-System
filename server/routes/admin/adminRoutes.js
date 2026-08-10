const express = require("express");
const router = express.Router();
const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const requirePermission = require("../../middleware/requirePermission");
const { authenticate } = require("../../middleware/authenticate");

// All admin routes require authentication first
router.use(authenticate);
const adminFeedbacksController = require("../../controllers/admin/adminFeedbacks");
const userManagementController = require("../../controllers/admin/user-management");
const systemStatsController = require("../../controllers/admin/systemStatsController");
const systemSettingsController = require("../../controllers/admin/systemSettingsController");
const activityLogController = require("../../controllers/admin/activityLogController");
const ipBlocklistController = require("../../controllers/admin/ipBlocklistController");
const infrastructureController = require("../../controllers/admin/infrastructureController");
const alertController = require("../../controllers/admin/alertController");
const moduleController = require("../../controllers/modules/moduleController");
const mdrrmoOverviewController = require("../../controllers/admin/mdrrmoOverviewController");
const certificateManagementController = require("../../controllers/admin/certificateManagement");
const { adminDataLimiter, adminWriteLimiter, destructiveActionLimiter } = require("../../middleware/rateLimiters");
const ModuleService = require("../../services/modules/ModuleService");

// Existing routes

// @route   GET /api/admin/residents
// @desc    Get all residents with pagination and scoping
// @access  Private (admin/system_admin only)
router.get("/residents", requireRole(ADMIN_ROLES), adminDataLimiter, requirePermission('view_users'), userManagementController.getResidents);

// @route   GET /api/admin/modules
// @desc    Get all modules with pagination and scoping
// @access  Private (admin/system_admin only)
router.get("/modules", requireRole(ADMIN_ROLES), adminDataLimiter, requirePermission('manage_modules'), moduleController.getAllModules);

// @route   GET /api/admin/certificates
// @desc    Get all certificates with pagination and scoping
// @access  Private (admin only)
router.get("/certificates", requireRole(ADMIN_ROLES), adminDataLimiter, requirePermission('view_users'), certificateManagementController.getAllCertificates);

// @route   PATCH /api/admin/certificates/:certId/revoke
// @desc    Revoke a certificate
// @access  Private (admin only)
router.patch("/certificates/:certId/revoke", requireRole(ADMIN_ROLES), adminWriteLimiter, requirePermission('revoke_certificates'), certificateManagementController.revokeCertificate);

// @route   GET /api/admin/alerts/active
// @desc    Get all active critical system alerts
// @access  Private (admin only)
router.get("/alerts/active", requireRole(ADMIN_ROLES), alertController.getActiveAlerts);

// @route   POST /api/admin/users/provision
// @desc    Provision a new Admin Account
// @access  Private (system_admin only)
router.post("/users/provision", requireRole(ADMIN_ROLES), adminWriteLimiter, requirePermission('provision_admins'), userManagementController.provisionAdmin);

// @route   PUT /api/admin/users/:id
// @desc    Update a user
// @access  Private (admin only)
router.put("/users/:id", requireRole(ADMIN_ROLES), requirePermission('update_user_details'), userManagementController.updateUser);

// @route   DELETE /api/admin/users/:id
// @desc    Admin-initiated hard delete of a user
// @access  Private (system_admin only)
router.delete("/users/:id", requireRole(ADMIN_ROLES), requirePermission('manage_security'), userManagementController.deleteAccount);

// @route   PUT /api/admin/users/:id/password
// @desc    Reset user password (admin only)
// @access  Private (admin only)
router.put("/users/:id/password", requireRole(ADMIN_ROLES), requirePermission('reset_passwords'), userManagementController.resetUserPassword);

// System Admin specific routes
// @route   GET /api/admin/stats
// @desc    Get system-wide statistics
// @access  Private (system_admin only)
router.get("/stats", requireRole(ADMIN_ROLES), requirePermission('view_system_stats'), systemStatsController.getSystemStats);

// @route   GET /api/admin/activity-log
// @desc    Get paginated activity log
// @access  Private (system_admin only)
router.get("/activity-log", requireRole(ADMIN_ROLES), requirePermission('view_activity_logs'), activityLogController.getActivityLog);

// @route   GET /api/admin/activity-log/export
// @desc    Export activity log to CSV
// @access  Private (system_admin only)
router.get("/activity-log/export", requireRole(ADMIN_ROLES), requirePermission('view_activity_logs'), activityLogController.exportActivityLog);

// @route   PATCH /api/admin/users/:id/role
// @desc    Update a user's role
// @access  Private (system_admin only)
router.patch("/users/:id/role", requireRole(ADMIN_ROLES), adminWriteLimiter, requirePermission('update_user_roles'), userManagementController.updateUserRole);

// @route   PATCH /api/admin/users/:id/ban
// @desc    Ban a user
// @access  Private (system_admin only)
router.patch("/users/:id/ban", requireRole(ADMIN_ROLES), destructiveActionLimiter, requirePermission('ban_users'), userManagementController.banUser);

// @route   PATCH /api/admin/users/:id/unban
// @desc    Unban a user
// @access  Private (system_admin only)
router.patch("/users/:id/unban", requireRole(ADMIN_ROLES), destructiveActionLimiter, requirePermission('ban_users'), userManagementController.unbanUser);

// @route   PATCH /api/admin/users/:id/archive
// @desc    Archive or unarchive a user
// @access  Private (system_admin only)
router.patch("/users/:id/archive", requireRole(ADMIN_ROLES), destructiveActionLimiter, requirePermission('archive_users'), userManagementController.archiveUser);

// @route   PATCH /api/admin/users/bulk-archive
// @desc    Bulk archive users
// @access  Private (system_admin only)
router.patch("/users/bulk-archive", requireRole(ADMIN_ROLES), destructiveActionLimiter, requirePermission('archive_users'), userManagementController.bulkArchiveUsers);

// @route   GET /api/admin/analytics/traffic
// @desc    Get 24h traffic analytics
// @access  Private (system_admin only)
router.get("/analytics/traffic", requireRole(ADMIN_ROLES), requirePermission('view_system_stats'), systemStatsController.getTrafficAnalytics);

// @route   GET /api/admin/settings
// @desc    Get system settings
// @access  Private (system_admin only)
router.get("/settings", requireRole(ADMIN_ROLES), requirePermission('manage_system_settings'), systemSettingsController.getSystemSettings);

// @route   PATCH /api/admin/settings/branding
// @desc    Update system branding (name and logo)
// @access  Private (system_admin only)
router.patch("/settings/branding", requireRole(ADMIN_ROLES), requirePermission('manage_system_settings'), systemSettingsController.updateSystemBranding);

// @route   PATCH /api/admin/settings/maintenance
// @desc    Toggle maintenance mode
// @access  Private (system_admin only)
router.patch("/settings/maintenance", requireRole(ADMIN_ROLES), requirePermission('manage_system_settings'), systemSettingsController.setMaintenanceMode);

// @route   PATCH /api/admin/settings/broadcast
// @desc    Update broadcast message
// @access  Private (system_admin only)
router.patch("/settings/broadcast", requireRole(ADMIN_ROLES), requirePermission('manage_system_settings'), systemSettingsController.updateBroadcast);

// @route   PATCH /api/admin/settings/organization
// @desc    Update organization details
// @access  Private (system_admin only)
router.patch("/settings/organization", requireRole(ADMIN_ROLES), requirePermission('manage_system_settings'), systemSettingsController.updateOrganizationDetails);

// @route   GET /api/admin/security/blocked-ips
router.get("/security/blocked-ips", requireRole(ADMIN_ROLES), requirePermission('manage_security'), ipBlocklistController.getBlockedIps);

// @route   POST /api/admin/security/blocked-ips
router.post("/security/blocked-ips", requireRole(ADMIN_ROLES), requirePermission('manage_security'), ipBlocklistController.addBlockedIp);

// @route   DELETE /api/admin/security/blocked-ips/:id
router.delete("/security/blocked-ips/:id", requireRole(ADMIN_ROLES), requirePermission('manage_security'), ipBlocklistController.removeBlockedIp);

// @route   POST /api/admin/security/force-logout-all
router.post("/security/force-logout-all", requireRole(ADMIN_ROLES), requirePermission('manage_security'), ipBlocklistController.forceLogoutAll);

// @route   GET /api/admin/health
// @desc    Get system health status
// @access  Private (system_admin only)
router.get("/health", requireRole(ADMIN_ROLES), requirePermission('view_system_stats'), systemStatsController.getHealthStatus);

// @route   GET /api/admin/infrastructure/backup
// @desc    Download full database backup
// @access  Private (system_admin only)
router.get("/infrastructure/backup", requireRole(ADMIN_ROLES), requirePermission('manage_security'), infrastructureController.downloadDatabaseBackup);
router.get("/infrastructure/logs", requireRole(ADMIN_ROLES), requirePermission('manage_security'), infrastructureController.downloadServerLogs);

// ==========================================
// MDRRMO Admin Dashboards (also accessible by System Admin)
// ==========================================

// @route   GET /api/admin/mdrrmo/metrics
// @desc    Get MDRRMO dashboard metrics
// @access  Private (mdrrmo_admin, system_admin)
router.get("/mdrrmo/metrics", requireRole(ADMIN_ROLES), adminDataLimiter, mdrrmoOverviewController.getMetrics);

// @route   GET /api/admin/mdrrmo/module-distribution
// @desc    Get module distribution by category
// @access  Private (mdrrmo_admin, system_admin)
router.get("/mdrrmo/module-distribution", requireRole(ADMIN_ROLES), adminDataLimiter, mdrrmoOverviewController.getModuleDistribution);

// @route   GET /api/admin/mdrrmo/enrollment-trend
// @desc    Get 7-day enrollment trend
// @access  Private (mdrrmo_admin, system_admin)
router.get("/mdrrmo/enrollment-trend", requireRole(ADMIN_ROLES), adminDataLimiter, mdrrmoOverviewController.getEnrollmentTrend);

// @route   GET /api/admin/mdrrmo/recent-activity
// @desc    Get recent activity logs
// @access  Private (mdrrmo_admin, system_admin)
router.get("/mdrrmo/recent-activity", requireRole(ADMIN_ROLES), adminDataLimiter, mdrrmoOverviewController.getRecentActivity);

// @route   GET /api/admin/mdrrmo/activity-log
// @desc    Get paginated MDRRMO activity log (excludes system admin actions)
// @access  Private (mdrrmo_admin, system_admin)
router.get("/mdrrmo/activity-log", requireRole(ADMIN_ROLES), adminDataLimiter, activityLogController.getMdrrmoActivityLog);

// @route   GET /api/admin/mdrrmo/activity-log/export
// @desc    Export MDRRMO activity log to CSV (excludes system admin actions)
// @access  Private (mdrrmo_admin, system_admin)
router.get("/mdrrmo/activity-log/export", requireRole(ADMIN_ROLES), adminDataLimiter, activityLogController.exportMdrrmoActivityLog);


// @route   GET /api/admin/mdrrmo/sector-overview
// @desc    Get aggregate data per barangay for Sector Overview
router.get("/mdrrmo/sector-overview", requireRole(ADMIN_ROLES), adminDataLimiter, mdrrmoOverviewController.getSectorOverview);

// @route   GET /api/admin/mdrrmo/sector-overview/category-breakdown
// @desc    Get category breakdown for certificates per barangay
router.get("/mdrrmo/sector-overview/category-breakdown", requireRole(ADMIN_ROLES), adminDataLimiter, mdrrmoOverviewController.getSectorOverviewCategoryBreakdown);

// ==========================================
// Admin Feedback Management Routes
// ==========================================

// @route   GET /api/admin/mdrrmo/feedback
// @desc    Get scoped feedback list (MDRRMO sees all/filtered, Barangay Admin sees own barangay)
// @access  Private (mdrrmo_admin, barangay_admin, system_admin)
router.get(
  "/mdrrmo/feedback",requireRole(ADMIN_ROLES), adminDataLimiter, adminFeedbacksController.getAdminFeedbacks
);

// @route   PUT /api/admin/mdrrmo/feedback/:id/reply
// @desc    Submit an official reply and update ticket status
// @access  Private (mdrrmo_admin, barangay_admin, system_admin)
router.put(
  "/mdrrmo/feedback/:id/reply", requireRole(ADMIN_ROLES), adminWriteLimiter, adminFeedbacksController.replyToFeedback
);

router.get(
  "/mdrrmo/approvals", requireRole(ADMIN_ROLES), adminWriteLimiter, moduleController.getPendingModulesReview
);

router.put(
  "/mdrrmo/module/:id/review", requireRole(ADMIN_ROLES), adminWriteLimiter, moduleController.updateModuleStatus);
module.exports = router;
