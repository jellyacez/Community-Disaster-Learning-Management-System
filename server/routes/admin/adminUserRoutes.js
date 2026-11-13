const express = require("express");
const router = express.Router();

const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const requirePermission = require("../../middleware/requirePermission");
const { adminDataLimiter, adminWriteLimiter, destructiveActionLimiter } = require("../../middleware/rateLimiters");

const userManagementController = require("../../controllers/admin/user-management");

// @route   GET /api/admin/residents
router.get(
  "/residents",
  requireRole(ADMIN_ROLES),
  adminDataLimiter,
  requirePermission("view_users"),
  userManagementController.getResidents
);

// @route   POST /api/admin/users/provision
router.post(
  "/users/provision",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  requirePermission("provision_admins"),
  userManagementController.provisionAdmin
);

// @route   PUT /api/admin/users/:id
router.put(
  "/users/:id",
  requireRole(ADMIN_ROLES),
  requirePermission("update_user_details"),
  userManagementController.updateUser
);

// @route   DELETE /api/admin/users/:id
// @desc    Admin-initiated hard delete of a user
router.delete(
  "/users/:id",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_security"),
  userManagementController.deleteAccount
);

// @route   PUT /api/admin/users/:id/password
router.put(
  "/users/:id/password",
  requireRole(ADMIN_ROLES),
  requirePermission("reset_passwords"),
  userManagementController.resetUserPassword
);

// @route   PATCH /api/admin/users/:id/role
router.patch(
  "/users/:id/role",
  requireRole(ADMIN_ROLES),
  adminWriteLimiter,
  requirePermission("update_user_roles"),
  userManagementController.updateUserRole
);

// @route   PATCH /api/admin/users/:id/ban
router.patch(
  "/users/:id/ban",
  requireRole(ADMIN_ROLES),
  destructiveActionLimiter,
  requirePermission("ban_users"),
  userManagementController.banUser
);

// @route   PATCH /api/admin/users/:id/unban
router.patch(
  "/users/:id/unban",
  requireRole(ADMIN_ROLES),
  destructiveActionLimiter,
  requirePermission("ban_users"),
  userManagementController.unbanUser
);

// @route   PATCH /api/admin/users/:id/archive
router.patch(
  "/users/:id/archive",
  requireRole(ADMIN_ROLES),
  destructiveActionLimiter,
  requirePermission("archive_users"),
  userManagementController.archiveUser
);

// @route   PATCH /api/admin/users/bulk-archive
router.patch(
  "/users/bulk-archive",
  requireRole(ADMIN_ROLES),
  destructiveActionLimiter,
  requirePermission("archive_users"),
  userManagementController.bulkArchiveUsers
);

module.exports = router;
