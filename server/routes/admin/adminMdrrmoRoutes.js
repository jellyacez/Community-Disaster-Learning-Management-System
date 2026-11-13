const express = require("express");
const router = express.Router();

const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const requirePermission = require("../../middleware/requirePermission");
const { adminDataLimiter, adminWriteLimiter } = require("../../middleware/rateLimiters");
const validate = require("../../middleware/validate");
const { announcementSchema } = require("../../utils/validators");

// MDRRMO dashboards expose municipality-wide data; barangay_admin is excluded
const MDRRMO_DASHBOARD_ROLES = ["super_admin", "system_admin", "mdrrmo_admin", "head_mdrrmo_admin"];

const moduleController = require("../../controllers/modules/moduleController");
const mdrrmoOverviewController = require("../../controllers/admin/mdrrmoOverviewController");
const certificateManagementController = require("../../controllers/admin/certificateManagement");
const adminFeedbacksController = require("../../controllers/admin/adminFeedbacks");
const activityLogController = require("../../controllers/admin/activityLogController");
const barangayController = require("../../controllers/admin/barangayController");

// @route   GET /api/admin/modules
router.get(
  "/modules",
  requireRole(["super_admin","system_admin", "mdrrmo_admin", "head_mdrrmo_admin"]),
  adminDataLimiter,
  requirePermission("manage_modules"),
  moduleController.getAllModules
);

// @route   GET /api/admin/certificates
router.get(
  "/certificates",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  requirePermission("view_users"),
  certificateManagementController.getAllCertificates
);

// @route   PATCH /api/admin/certificates/:certId/revoke
// @desc    [DEPRECATED] Revocation deprecated in favor of annual recertification
router.patch(
  "/certificates/:certId/revoke",
  requireRole(ADMIN_ROLES),
  (req, res) => {
    return res.status(410).json({
      success: false,
      message: "Certificate revocation has been deprecated. The system uses annual recertification to track competency currency.",
    });
  }
);

// @route   PATCH /api/admin/certificates/:certId/reinstate
// @desc    [DEPRECATED] Reinstatement deprecated along with revocation
router.patch(
  "/certificates/:certId/reinstate",
  requireRole(ADMIN_ROLES),
  (req, res) => {
    return res.status(410).json({
      success: false,
      message: "Certificate reinstatement has been deprecated. Residents recertify by retaking module assessments.",
    });
  }
);


// @route   GET /api/admin/mdrrmo/metrics
router.get(
  "/mdrrmo/metrics",
  requireRole(MDRRMO_DASHBOARD_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getMetrics
);

// @route   GET /api/admin/mdrrmo/report/export
// @desc    Export the training accomplishment report (.xlsx) for a date range
router.get(
  "/mdrrmo/report/export",
  requireRole(MDRRMO_DASHBOARD_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.exportAccomplishmentReport
);

// @route   GET /api/admin/mdrrmo/module-distribution
router.get(
  "/mdrrmo/module-distribution",
  requireRole(MDRRMO_DASHBOARD_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getModuleDistribution
);

// @route   GET /api/admin/mdrrmo/enrollment-trend
// @desc    Get 7-day enrollment trend
router.get(
  "/mdrrmo/enrollment-trend",
  requireRole(MDRRMO_DASHBOARD_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getEnrollmentTrend
);

// @route   GET /api/admin/mdrrmo/recent-activity
router.get(
  "/mdrrmo/recent-activity",
  requireRole(MDRRMO_DASHBOARD_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getRecentActivity
);

// @route   GET /api/admin/mdrrmo/activity-log
// @desc    Get paginated MDRRMO activity log (excludes system admin actions)
router.get(
  "/mdrrmo/activity-log",
  requireRole(MDRRMO_DASHBOARD_ROLES),
  adminDataLimiter,
  activityLogController.getMdrrmoActivityLog
);

// @route   GET /api/admin/mdrrmo/activity-log/export
// @desc    Export MDRRMO activity log to CSV (excludes system admin actions)
router.get(
  "/mdrrmo/activity-log/export",
  requireRole(MDRRMO_DASHBOARD_ROLES),
  adminDataLimiter,
  activityLogController.exportMdrrmoActivityLog
);

// @route   GET /api/admin/mdrrmo/sector-overview
router.get(
  "/mdrrmo/sector-overview",
  requireRole(MDRRMO_DASHBOARD_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getSectorOverview
);

// @route   GET /api/admin/mdrrmo/sector-overview/category-breakdown
router.get(
  "/mdrrmo/sector-overview/category-breakdown",
  requireRole(MDRRMO_DASHBOARD_ROLES),
  adminDataLimiter,
  mdrrmoOverviewController.getSectorOverviewCategoryBreakdown
);


// @route   GET /api/admin/mdrrmo/feedback
// @desc    Get scoped feedback list (MDRRMO sees all/filtered, Barangay Admin sees own barangay)
router.get(
  "/mdrrmo/feedback",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  adminFeedbacksController.getAdminFeedbacks
);

// @route   PUT /api/admin/mdrrmo/feedback/:id/reply
// @desc    Submit an official reply and update ticket status
router.put(
  "/mdrrmo/feedback/:id/reply",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  adminFeedbacksController.replyToFeedback
);

// @route   PUT /api/admin/mdrrmo/feedback/:id/close
router.put(
  "/mdrrmo/feedback/:id/close",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  adminFeedbacksController.closeFeedbackThread
);

router.get(
  "/mdrrmo/approvals",
  requireRole(["super_admin","head_mdrrmo_admin"]),
  adminWriteLimiter,
  requirePermission("approve_modules"),
  moduleController.getPendingModulesReview
);

router.put(
  "/mdrrmo/module/:id/review",
  requireRole(["super_admin","head_mdrrmo_admin"]),
  adminWriteLimiter,
  requirePermission("approve_modules"),
  moduleController.updateModuleStatus
);

// @route   GET /api/admin/mdrrmo/certifications/analytics
router.get(
  "/mdrrmo/certifications/analytics",
  requireRole(["super_admin","system_admin", "mdrrmo_admin", "head_mdrrmo_admin"]),
  adminDataLimiter,
  mdrrmoOverviewController.getMunicipalCertAnalytics
);

// @route   GET /api/admin/mdrrmo/certifications/feed
router.get(
  "/mdrrmo/certifications/feed",
  requireRole(["super_admin","system_admin", "mdrrmo_admin", "head_mdrrmo_admin"]),
  adminDataLimiter,
  mdrrmoOverviewController.getMunicipalCertFeed
);

// @route   POST /api/admin/mdrrmo/announcements
// @desc    Broadcast municipal advisory (all sectors or targeted barangay)
router.post(
  "/mdrrmo/announcements",
  requireRole(["super_admin","system_admin", "mdrrmo_admin", "head_mdrrmo_admin"]),
  adminWriteLimiter,
  validate(announcementSchema),
  barangayController.createBarangayAnnouncement
);

// Same roles that see the Module Request page (adminNavLinks.js, App.jsx)
const MODULE_REQUEST_ROLES = ["super_admin", "head_mdrrmo_admin", "mdrrmo_admin"];

router.get(
  "/module-requests",
  requireRole(MODULE_REQUEST_ROLES),
  adminDataLimiter,
  requirePermission("manage_modules"),
  moduleController.getPendingModuleRequests
);
// One write for a whole selection, so a long queue doesn't run into adminWriteLimiter
router.post(
  "/module-requests/bulk-decide",
  requireRole(MODULE_REQUEST_ROLES),
  adminWriteLimiter,
  requirePermission("manage_modules"),
  moduleController.bulkDecideModuleRequests
);
router.post(
  "/module-requests/:requestId/approve",
  requireRole(MODULE_REQUEST_ROLES),
  adminWriteLimiter,
  requirePermission("manage_modules"),
  moduleController.approveModuleRequest
);
router.post(
  "/module-requests/:requestId/reject",
  requireRole(MODULE_REQUEST_ROLES),
  adminWriteLimiter,
  requirePermission("manage_modules"),
  moduleController.rejectModuleRequest
);

module.exports = router;
