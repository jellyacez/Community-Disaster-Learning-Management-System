const ROLE_PERMISSIONS = {
  system_admin: [
    'provision_admins',
    'update_user_details',
    'reset_passwords',
    'update_user_roles',
    'ban_users',
    'archive_users',
    'view_system_stats',
    'view_activity_logs',
    'manage_system_settings',
    'manage_security',
    'manage_modules',
    'view_users'
  ],
  mdrrmo_admin: [
    'view_system_stats',
    'view_activity_logs',
    'manage_modules',
    'view_users'
  ],
  barangay_admin: [
    'view_system_stats',
    'view_users'
  ]
};

module.exports = { ROLE_PERMISSIONS };
