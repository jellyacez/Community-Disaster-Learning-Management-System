const express = require("express");
const router = express.Router();

const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const { adminDataLimiter, adminWriteLimiter } = require("../../middleware/rateLimiters");
const validate = require("../../middleware/validate");
const { announcementSchema } = require("../../utils/validators");

const barangayController = require("../../controllers/admin/barangayController");

// ==========================================
// Barangay Admin Dashboards & Features
// ==========================================

// @route   GET /api/admin/barangay/analytics
// @desc    Get scoped analytics for Barangay Admin
// @access  Private (barangay_admin, system_admin)
router.get(
  "/barangay/analytics",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  barangayController.getBarangayAnalytics
);

// @route   GET /api/admin/barangay/certifications
// @desc    Get scoped resident certification roster for Barangay Admin
// @access  Private (barangay_admin only)
router.get(
  "/barangay/certifications",
  requireRole(["barangay_admin"]),
  adminDataLimiter,
  barangayController.getBarangayCertifications
);

// @route   GET /api/admin/barangay/announcements
// @desc    Get local announcements & alerts
// @access  Private (barangay_admin, system_admin)
router.get(
  "/barangay/announcements",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  barangayController.getBarangayAnnouncements
);

// @route   POST /api/admin/barangay/announcements
// @desc    Publish a new local alert/announcement
// @access  Private (barangay_admin, system_admin)
router.post(
  "/barangay/announcements",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  validate(announcementSchema),
  barangayController.createBarangayAnnouncement
);

// @route   GET /api/admin/barangay/activity-log
// @desc    Get activity logs for residents in the assigned barangay
// @access  Private (barangay_admin only)
router.get(
  "/barangay/activity-log",
  requireRole(["barangay_admin"]),
  adminDataLimiter,
  barangayController.getBarangayActivityLog
);

module.exports = router;
