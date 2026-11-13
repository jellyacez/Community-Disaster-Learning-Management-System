const express = require("express");
const router = express.Router();

const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const { adminDataLimiter, adminWriteLimiter } = require("../../middleware/rateLimiters");
const validate = require("../../middleware/validate");
const { announcementSchema } = require("../../utils/validators");

const barangayController = require("../../controllers/admin/barangayController");


// @route   GET /api/admin/barangay/analytics
router.get(
  "/barangay/analytics",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  barangayController.getBarangayAnalytics
);

// @route   GET /api/admin/barangay/certifications
router.get(
  "/barangay/certifications",
  requireRole(["super_admin","barangay_admin"]),
  adminDataLimiter,
  barangayController.getBarangayCertifications
);

// @route   GET /api/admin/barangay/announcements
router.get(
  "/barangay/announcements",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  barangayController.getBarangayAnnouncements
);

// @route   POST /api/admin/barangay/announcements
router.post(
  "/barangay/announcements",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  validate(announcementSchema),
  barangayController.createBarangayAnnouncement
);

// @route   PATCH /api/admin/barangay/announcements/:id/lift
// @desc    End an urgent advisory early (barangay admins: own barangay only)
router.patch(
  "/barangay/announcements/:id/lift",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  barangayController.liftAnnouncement
);

// @route   GET /api/admin/barangay/activity-log
// @desc    Get activity logs for residents in the assigned barangay
router.get(
  "/barangay/activity-log",
  requireRole(["super_admin","barangay_admin"]),
  adminDataLimiter,
  barangayController.getBarangayActivityLog
);

// @route   GET /api/admin/barangay/report/export
// @desc    Export the barangay training accomplishment report (.xlsx) for a date range
router.get(
  "/barangay/report/export",
  requireRole(["super_admin","barangay_admin"]),
  adminDataLimiter,
  barangayController.exportBarangayReport
);

module.exports = router;
