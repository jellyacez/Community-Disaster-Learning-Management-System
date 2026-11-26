const pool = require("../../../config/db");
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");
const { logActivity, logError } = require("../../../utils/logger");
const { ROLE_RANKS } = require("../../../config/roleHierarchy");
const { sendAccountNotice } = require("../../../services/accountNoticeService");
const { AppError, securityFault } = require("../../../utils/httpErrors");

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

  // only a super_admin can grant super_admin
  if (role === 'super_admin' && !isSuperAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Only a Super Admin can promote accounts to Super Admin.',
    });
  }

  // can't change your own role
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
        throw securityFault("Your account isn't assigned to a barangay yet. Ask an administrator to assign one.", "barangay_admin has no barangay_id", { actorId: adminContext.id, route: req.originalUrl });
      }
      fetchQuery += ' AND barangay_id = $2';
      fetchParams.push(adminContext.barangay_id);
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw securityFault("You don't have permission to do this.", `role ${adminContext.role} attempted to update user roles`, { actorId: adminContext.id, route: req.originalUrl });
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
        message: 'Only a Super Admin can modify an existing Super Admin account.',
      });
    }

    const adminRank = ROLE_RANKS[adminContext.role] || 0;
    const targetCurrentRank = ROLE_RANKS[targetUser.role] || 0;
    const newRoleRank = ROLE_RANKS[role] || 0;

    if (!isSuperAdmin) {
      if (targetCurrentRank >= adminRank) {
        throw securityFault("You cannot change the role of an account with equal or higher privilege.", `Actor ${adminContext.role} on target role ${targetUser.role}`, { actorId: adminContext.id, route: req.originalUrl });
      }
      if (newRoleRank >= adminRank) {
        throw securityFault("You can only give roles below your own.", `Actor ${adminContext.role} assigning ${role}`, { actorId: adminContext.id, route: req.originalUrl });
      }
    }

    // never demote the last system_admin or super_admin
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

    // revoke sessions so the new permissions apply on next sign-in
    await pool.query('DELETE FROM "session" WHERE "userId" = $1', [id]);

    const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
    logActivity(adminContext.id, `Updated role for ${result.rows[0].email} from ${targetUser.role} to ${role} [Scope: ${scopeStr}]`);
    if (targetUser.role !== role) {
      sendAccountNotice(id, 'roleChanged', { fromRole: targetUser.role, toRole: role });
    }

    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
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