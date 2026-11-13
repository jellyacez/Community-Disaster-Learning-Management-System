const express = require("express");
const router = express.Router();
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");
const {
  verifyBackupPassword,
} = require("../../middleware/verifyBackupPassword");
const BACKUP_ROLES = ["system_admin", "super_admin"];

const backupUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 65 * 1024 * 1024,
    files: 1,
    fields: 2,
    parts: 3,
    fieldSize: 1024,
  },
});

// The route already requires authentication before this per-account limiter.
const backupPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.user.id),
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many failed backup attempts. Try again in 15 minutes.",
  },
});

const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const requirePermission = require("../../middleware/requirePermission");

const systemStatsController = require("../../controllers/admin/systemStatsController");
const systemSettingsController = require("../../controllers/admin/systemSettingsController");
const activityLogController = require("../../controllers/admin/activityLogController");
const ipBlocklistController = require("../../controllers/admin/ipBlocklistController");
const infrastructureController = require("../../controllers/admin/infrastructureController");
const alertController = require("../../controllers/admin/alertController");
// @route   GET /api/admin/alerts/active
router.get(
  "/alerts/active",
  requireRole(ADMIN_ROLES),
  alertController.getActiveAlerts,
);

// @route   GET /api/admin/stats
router.get(
  "/stats",
  requireRole(ADMIN_ROLES),
  requirePermission("view_system_stats"),
  systemStatsController.getSystemStats,
);

// @route   GET /api/admin/activity-log
router.get(
  "/activity-log",
  requireRole(ADMIN_ROLES),
  requirePermission("view_activity_logs"),
  activityLogController.getActivityLog,
);

// @route   GET /api/admin/activity-log/export
router.get(
  "/activity-log/export",
  requireRole(ADMIN_ROLES),
  requirePermission("view_activity_logs"),
  activityLogController.exportActivityLog,
);

// @route   GET /api/admin/analytics/traffic
router.get(
  "/analytics/traffic",
  requireRole(ADMIN_ROLES),
  requirePermission("view_system_stats"),
  systemStatsController.getTrafficAnalytics,
);

// @route   GET /api/admin/settings
router.get(
  "/settings",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_system_settings"),
  systemSettingsController.getSystemSettings,
);
// @route   GET /api/admin/settings/logo
// @desc    Retrieve the logo separately from polled settings
router.get(
  "/settings/logo",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_system_settings"),
  systemSettingsController.getSystemLogo,
);

// @route   PATCH /api/admin/settings/branding
// @desc    Update system branding (name and logo)
router.patch(
  "/settings/branding",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_system_settings"),
  systemSettingsController.updateSystemBranding,
);

// @route   PATCH /api/admin/settings/maintenance
router.patch(
  "/settings/maintenance",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_system_settings"),
  systemSettingsController.setMaintenanceMode,
);

// @route   PATCH /api/admin/settings/broadcast
router.patch(
  "/settings/broadcast",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_system_settings"),
  systemSettingsController.updateBroadcast,
);

// @route   PATCH /api/admin/settings/organization
router.patch(
  "/settings/organization",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_system_settings"),
  systemSettingsController.updateOrganizationDetails,
);

// @route   GET /api/admin/security/blocked-ips
router.get(
  "/security/blocked-ips",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_security"),
  ipBlocklistController.getBlockedIps,
);

// @route   POST /api/admin/security/blocked-ips
router.post(
  "/security/blocked-ips",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_security"),
  ipBlocklistController.addBlockedIp,
);

// @route   DELETE /api/admin/security/blocked-ips/:id
router.delete(
  "/security/blocked-ips/:id",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_security"),
  ipBlocklistController.removeBlockedIp,
);

// @route   POST /api/admin/security/force-logout-all
router.post(
  "/security/force-logout-all",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_security"),
  ipBlocklistController.forceLogoutAll,
);

// @route   GET /api/admin/health
router.get(
  "/health",
  requireRole(ADMIN_ROLES),
  requirePermission("view_system_stats"),
  systemStatsController.getHealthStatus,
);

// @route   POST /api/admin/infrastructure/backup
// @desc    Verify account password, then download an encrypted database ZIP


router.post(
  "/infrastructure/backup",
  requireRole(BACKUP_ROLES),
  requirePermission("manage_security"),
  backupPasswordLimiter,
  verifyBackupPassword,
  infrastructureController.downloadDatabaseBackup,
);

router.post(
  "/infrastructure/restore",
  requireRole(BACKUP_ROLES),
  requirePermission("manage_security"),
  (req, res, next) => {
    backupUpload.single("backup")(req, res, (error) => {
      if (error) {
        return res
          .status(400)
          .json({ error: "Invalid upload or backup exceeds 65 MiB." });
      }
      next();
    });
  },
  infrastructureController.restoreDatabaseBackup,
);

// @route   GET /api/admin/infrastructure/logs
router.get(
  "/infrastructure/logs",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_security"),
  infrastructureController.downloadServerLogs,
);

module.exports = router;
