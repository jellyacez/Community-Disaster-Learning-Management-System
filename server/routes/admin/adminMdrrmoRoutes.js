const express = require("express");
const router = express.Router();

const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const requirePermission = require("../../middleware/requirePermission");
const { adminDataLimiter, adminWriteLimiter } = require("../../middleware/rateLimiters");

const moduleController = require("../../controllers/modules/moduleController");
const mdrrmoOverviewController = require("../../controllers/admin/mdrrmoOverviewController");
const certificateManagementController = require("../../controllers/admin/certificateManagement");
const adminFeedbacksController = require("../../controllers/admin/adminFeedbacks");
const activityLogController = require("../../controllers/admin/activityLogController");

// @route   GET /api/admin/modules
// @desc    Get all modules with pagination and scoping
// @access  Private (admin/system_admin only)
router.get(
  "/modules",
  requireRole(["system_admin", "mdrrmo_admin", "head_mdrrmo_admin"]),
  adminDataLimiter,
  requirePermission("manage_modules"),
  moduleController.getAllModules
);

// @route   GET /api/admin/certificates
// @desc    Get all certificates with pagination and scoping
// @access  Private (admin only)
router.get(
  "/certificates",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  requirePermission("view_users"),
  certificateManagementController.getAllCertificates
);

// @route   PATCH /api/admin/certificates/:certId/revoke
// @desc    Revoke a certificate
// @access  Private (admin only)
router.patch(
  "/certificates/:certId/revoke",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  requirePermission("revoke_certificates"),
  certificateManagementController.revokeCertificate
);

// ==========================================
// MDRRMO Admin Dashboards (also accessible by System Admin)
// ==========================================

// @route   GET /api/admin/mdrrmo/metrics
// @desc    Get MDRRMO dashboard metrics
// @access  Private (mdrrmo_admin, system_admin)
router.get(
  "/mdrrmo/metrics",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getMetrics
);

// @route   GET /api/admin/mdrrmo/module-distribution
// @desc    Get module distribution by category
// @access  Private (mdrrmo_admin, system_admin)
router.get(
  "/mdrrmo/module-distribution",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getModuleDistribution
);

// @route   GET /api/admin/mdrrmo/enrollment-trend
// @desc    Get 7-day enrollment trend
// @access  Private (mdrrmo_admin, system_admin)
router.get(
  "/mdrrmo/enrollment-trend",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getEnrollmentTrend
);

// @route   GET /api/admin/mdrrmo/recent-activity
// @desc    Get recent activity logs
// @access  Private (mdrrmo_admin, system_admin)
router.get(
  "/mdrrmo/recent-activity",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getRecentActivity
);

// @route   GET /api/admin/mdrrmo/activity-log
// @desc    Get paginated MDRRMO activity log (excludes system admin actions)
// @access  Private (mdrrmo_admin, system_admin)
router.get(
  "/mdrrmo/activity-log",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  activityLogController.getMdrrmoActivityLog
);

// @route   GET /api/admin/mdrrmo/activity-log/export
// @desc    Export MDRRMO activity log to CSV (excludes system admin actions)
// @access  Private (mdrrmo_admin, system_admin)
router.get(
  "/mdrrmo/activity-log/export",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  activityLogController.exportMdrrmoActivityLog
);

// @route   GET /api/admin/mdrrmo/sector-overview
// @desc    Get aggregate data per barangay for Sector Overview
router.get(
  "/mdrrmo/sector-overview",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getSectorOverview
);

// @route   GET /api/admin/mdrrmo/sector-overview/category-breakdown
// @desc    Get category breakdown for certificates per barangay
router.get(
  "/mdrrmo/sector-overview/category-breakdown",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getSectorOverviewCategoryBreakdown
);

// ==========================================
// Admin Feedback Management Routes
// ==========================================

// @route   GET /api/admin/mdrrmo/feedback
// @desc    Get scoped feedback list (MDRRMO sees all/filtered, Barangay Admin sees own barangay)
// @access  Private (mdrrmo_admin, barangay_admin, system_admin)
router.get(
  "/mdrrmo/feedback",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  adminFeedbacksController.getAdminFeedbacks
);

// @route   PUT /api/admin/mdrrmo/feedback/:id/reply
// @desc    Submit an official reply and update ticket status
// @access  Private (mdrrmo_admin, barangay_admin, system_admin)
router.put(
  "/mdrrmo/feedback/:id/reply",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  adminFeedbacksController.replyToFeedback
);

// @route   PUT /api/admin/mdrrmo/feedback/:id/close
// @desc    Close a feedback ticket
// @access  Private (mdrrmo_admin, barangay_admin, system_admin)
router.put(
  "/mdrrmo/feedback/:id/close",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  adminFeedbacksController.closeFeedbackThread
);

router.get(
  "/mdrrmo/approvals",
  requireRole(["head_mdrrmo_admin"]),
  adminWriteLimiter,
  requirePermission("approve_modules"),
  moduleController.getPendingModulesReview
);

router.put(
  "/mdrrmo/module/:id/review",
  requireRole(["head_mdrrmo_admin"]),
  adminWriteLimiter,
  requirePermission("approve_modules"),
  moduleController.updateModuleStatus
);

// @route   GET /api/admin/mdrrmo/certifications/analytics
// @desc    Get municipal-wide certification analytics and compliance data
// @access  Private (mdrrmo_admin, system_admin)
router.get(
  "/mdrrmo/certifications/analytics",
  requireRole(["system_admin", "mdrrmo_admin", "head_mdrrmo_admin"]),
  adminDataLimiter,
  mdrrmoOverviewController.getMunicipalCertAnalytics
);

// @route   GET /api/admin/mdrrmo/certifications/feed
// @desc    Get municipal-wide paginated certificate action feed
// @access  Private (mdrrmo_admin, system_admin)
router.get(
  "/mdrrmo/certifications/feed",
  requireRole(["system_admin", "mdrrmo_admin", "head_mdrrmo_admin"]),
  adminDataLimiter,
  mdrrmoOverviewController.getMunicipalCertFeed
);

module.exports = router;
