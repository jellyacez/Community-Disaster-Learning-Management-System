const express = require("express");
const router = express.Router();

const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const requirePermission = require("../../middleware/requirePermission");
const { adminDataLimiter, adminWriteLimiter, destructiveActionLimiter } = require("../../middleware/rateLimiters");

const userManagementController = require("../../controllers/admin/user-management");

// @route   GET /api/admin/residents
// @desc    Get all residents with pagination and scoping
// @access  Private (admin/system_admin only)
router.get(
  "/residents",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  requirePermission("view_users"),
  userManagementController.getResidents
);

// @route   POST /api/admin/users/provision
// @desc    Provision a new Admin Account
// @access  Private (system_admin only)
router.post(
  "/users/provision",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  requirePermission("provision_admins"),
  userManagementController.provisionAdmin
);

// @route   PUT /api/admin/users/:id
// @desc    Update a user
// @access  Private (admin only)
router.put(
  "/users/:id",
  requireRole(ADMIN_ROLES),
  requirePermission("update_user_details"),
  userManagementController.updateUser
);

// @route   DELETE /api/admin/users/:id
// @desc    Admin-initiated hard delete of a user
// @access  Private (system_admin only)
router.delete(
  "/users/:id",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_security"),
  userManagementController.deleteAccount
);

// @route   PUT /api/admin/users/:id/password
// @desc    Reset user password (admin only)
// @access  Private (admin only)
router.put(
  "/users/:id/password",
  requireRole(ADMIN_ROLES),
  requirePermission("reset_passwords"),
  userManagementController.resetUserPassword
);

// @route   PATCH /api/admin/users/:id/role
// @desc    Update a user's role
// @access  Private (system_admin only)
router.patch(
  "/users/:id/role",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  requirePermission("update_user_roles"),
  userManagementController.updateUserRole
);

// @route   PATCH /api/admin/users/:id/ban
// @desc    Ban a user
// @access  Private (system_admin only)
router.patch(
  "/users/:id/ban",
  requireRole(ADMIN_ROLES),
  destructiveActionLimiter,
  requirePermission("ban_users"),
  userManagementController.banUser
);

// @route   PATCH /api/admin/users/:id/unban
// @desc    Unban a user
// @access  Private (system_admin only)
router.patch(
  "/users/:id/unban",
  requireRole(ADMIN_ROLES),
  destructiveActionLimiter,
  requirePermission("ban_users"),
  userManagementController.unbanUser
);

// @route   PATCH /api/admin/users/:id/archive
// @desc    Archive or unarchive a user
// @access  Private (system_admin only)
router.patch(
  "/users/:id/archive",
  requireRole(ADMIN_ROLES),
  destructiveActionLimiter,
  requirePermission("archive_users"),
  userManagementController.archiveUser
);

// @route   PATCH /api/admin/users/bulk-archive
// @desc    Bulk archive users
// @access  Private (system_admin only)
router.patch(
  "/users/bulk-archive",
  requireRole(ADMIN_ROLES),
  destructiveActionLimiter,
  requirePermission("archive_users"),
  userManagementController.bulkArchiveUsers
);

module.exports = router;
