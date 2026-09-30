const pool = require("../../../config/db");
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");
const { logActivity, logError } = require("../../../utils/logger");
const { ROLE_RANKS } = require("../../../config/roleHierarchy");

// @desc    Update a user's role
// @access  Private (system_admin and super_admin)
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = [
    'resident',
    'barangay_admin',
    'mdrrmo_admin',
    'head_mdrrmo_admin',
    'system_admin',
    'super_admin',
  ];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  const adminContext = req.user;
  if (!adminContext || !adminContext.role) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const isSuperAdmin = adminContext.role === 'super_admin';

  // Strict Safeguard: Only super_admin can grant the super_admin role
  if (role === 'super_admin' && !isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'SECURITY_FAULT: Only a Super Admin can promote accounts to Super Admin.',
    });
  }

  // Self-demotion safeguard
  if (String(adminContext.id) === String(id) && role !== adminContext.role) {
    return res.status(400).json({
      success: false,
      message: 'Action forbidden: You cannot modify or demote your own administrative role.',
    });
  }

  try {
    let fetchQuery = 'SELECT id, email, role, barangay_id FROM "user" WHERE id = $1';
    let fetchParams = [id];

    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      fetchQuery += ' AND barangay_id = $2';
      fetchParams.push(adminContext.barangay_id);
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to update user roles.`);
    }

    const targetRes = await pool.query(fetchQuery, fetchParams);
    if (targetRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found or out of scope' });
    }

    const targetUser = targetRes.rows[0];

    // Non-super_admin cannot touch an existing super_admin
    if (targetUser.role === 'super_admin' && !isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'SECURITY_FAULT: Only a Super Admin can modify an existing Super Admin account.',
      });
    }

    const adminRank = ROLE_RANKS[adminContext.role] || 0;
    const targetCurrentRank = ROLE_RANKS[targetUser.role] || 0;
    const newRoleRank = ROLE_RANKS[role] || 0;

    // Standard hierarchy for non-super_admin actors
    if (!isSuperAdmin) {
      if (targetCurrentRank >= adminRank) {
        throw new Error(`SECURITY_FAULT: Cannot modify role of a user with equal or higher role rank (${targetUser.role}).`);
      }
      if (newRoleRank >= adminRank) {
        throw new Error(`SECURITY_FAULT: Cannot assign a role (${role}) equal to or higher than your own rank.`);
      }
    }

    // Failsafe: Prevent last system_admin or super_admin from demoting out of existence
    if (targetUser.role === 'system_admin' && role !== 'system_admin') {
      const sysAdminCount = await pool.query('SELECT COUNT(*) FROM "user" WHERE role = \'system_admin\'');
      if (parseInt(sysAdminCount.rows[0].count, 10) <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the last remaining System Administrator.' });
      }
    }

    if (targetUser.role === 'super_admin' && role !== 'super_admin') {
      const superAdminCount = await pool.query('SELECT COUNT(*) FROM "user" WHERE role = \'super_admin\'');
      if (parseInt(superAdminCount.rows[0].count, 10) <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the last remaining Super Administrator.' });
      }
    }

    const result = await pool.query('UPDATE "user" SET role = $1 WHERE id = $2 RETURNING id, email', [role, id]);

    // Revoke sessions on role change so user must re-authenticate with new permissions
    await pool.query('DELETE FROM "session" WHERE "userId" = $1', [id]);

    const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
    logActivity(adminContext.id, `Updated role for ${result.rows[0].email} from ${targetUser.role} to ${role} [Scope: ${scopeStr}]`);

    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    if (err.message && err.message.startsWith('SECURITY_FAULT')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError('update_user_role_failure', {
      adminId: adminContext?.id,
      targetId: id,
      newRole: role,
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
};