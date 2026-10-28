const ROLE_PERMISSIONS = {
  super_admin: [
    "provision_admins",
    "update_user_details",
    "reset_passwords",
    "update_user_roles",
    "ban_users",
    "archive_users",
    "view_system_stats",
    "view_activity_logs",
    "manage_system_settings",
    "manage_security",
    "manage_modules",
    "approve_modules",
    "view_users",
  ],
  system_admin: [
    "provision_admins",
    "update_user_details",
    "reset_passwords",
    "update_user_roles",
    "ban_users",
    "archive_users",
    "view_system_stats",
    "view_activity_logs",
    "manage_system_settings",
    "manage_security",
    "manage_modules",
    "view_users",
  ],
  // ban/archive are limited by rank in the controllers (assertActorOutranksTarget):
  // MDRRMO admins reach barangay admins and residents; the head also reaches MDRRMO admins
  mdrrmo_admin: [
    "provision_admins",
    "ban_users",
    "archive_users",
    "view_system_stats",
    "view_activity_logs",
    "manage_modules",
    "view_users",
  ],
  head_mdrrmo_admin: [
    "approve_modules",
    "provision_admins",
    "ban_users",
    "archive_users",
    "view_system_stats",
    "view_activity_logs",
    "manage_modules",
    "view_users",
  ],
  barangay_admin: [
    "ban_users",
    "archive_users",
    "view_users",
  ],
};

const MFA_REQUIRED_ROLES = [
  "super_admin",
  "system_admin",
  "mdrrmo_admin",
  "barangay_admin",
  "head_mdrrmo_admin",
];
const UNSCOPED_ACCESS_ROLES = ["system_admin", "mdrrmo_admin", "head_mdrrmo_admin", "super_admin"];

// Keep in sync with client/src/constants/roles.js ADMIN_ROLES
const ADMIN_ROLES = [
  "super_admin",
  "system_admin",
  "mdrrmo_admin",
  "barangay_admin",
  "head_mdrrmo_admin",
];

const MODULE_VIEWER_ROLES = [
  "resident",
  "system_admin",
  "mdrrmo_admin",
  "head_mdrrmo_admin",
  "super_admin"
];

module.exports = {
  ROLE_PERMISSIONS,
  MFA_REQUIRED_ROLES,
  UNSCOPED_ACCESS_ROLES,
  ADMIN_ROLES,
  MODULE_VIEWER_ROLES,
};
