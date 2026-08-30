const pool = require("../../../config/db");
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");
const { logActivity, logError } = require("../../../utils/logger");

const ROLE_RANKS = {
  system_admin: 5,
  head_mdrrmo_admin: 4,
  mdrrmo_admin: 3,
  barangay_admin: 2,
  resident: 1,
};

// @desc    Update a user's role
// @access  Private (system_admin only)
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ['resident', 'barangay_admin', 'mdrrmo_admin', 'head_mdrrmo_admin', 'system_admin'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role' });
  }

  const adminContext = req.user;
  if (!adminContext || !adminContext.role) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    // 1. Enforce actor scope
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
    const adminRank = ROLE_RANKS[adminContext.role] || 0;
    const targetCurrentRank = ROLE_RANKS[targetUser.role] || 0;
    const newRoleRank = ROLE_RANKS[role] || 0;

    // 2. Enforce role hierarchy:
    // Non-system_admins cannot modify users of equal or higher rank, nor can they assign roles of equal or higher rank.
    if (adminContext.role !== 'system_admin') {
      if (targetCurrentRank >= adminRank) {
        throw new Error(`SECURITY_FAULT: Cannot modify role of a user with equal or higher role rank (${targetUser.role}).`);
      }
      if (newRoleRank >= adminRank) {
        throw new Error(`SECURITY_FAULT: Cannot assign a role (${role}) equal to or higher than your own rank.`);
      }
    }

    // Failsafe: Prevent last system_admin from self-demoting
    if (targetUser.role === 'system_admin' && role !== 'system_admin') {
      const sysAdminCount = await pool.query('SELECT COUNT(*) FROM "user" WHERE role = \'system_admin\'');
      if (parseInt(sysAdminCount.rows[0].count, 10) <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the last remaining System Administrator.' });
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

