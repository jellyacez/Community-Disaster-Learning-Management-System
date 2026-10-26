const pool = require("../../../config/db");
const { logActivity, logError } = require('../../../utils/logger');
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");
const { assertActorOutranksTarget } = require("../../../config/roleHierarchy");

function isUnscopedRole(role) {
  return role === "super_admin" || (Array.isArray(UNSCOPED_ACCESS_ROLES) && UNSCOPED_ACCESS_ROLES.includes(role));
}

// @desc    Archive or unarchive a user
// @access  Private (admin only — actor must strictly outrank target)
exports.archiveUser = async (req, res) => {
  const { id } = req.params;
  const archived = req.body.archived === true || req.body.archived === "true";
  try {
    const adminContext = req.user;

    let targetQuery = 'SELECT id, role, email FROM "user" WHERE id = $1';
    let targetValues = [id];

    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      targetQuery += ' AND barangay_id = $2';
      targetValues.push(adminContext.barangay_id);
    } else if (!isUnscopedRole(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to archive users.`);
    }

    const targetResult = await pool.query(targetQuery, targetValues);
    if (targetResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found or out of scope' });
    }

    const targetUser = targetResult.rows[0];

    // Protect super_admin from being archived
    if (targetUser.role === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super Administrator accounts cannot be archived.' });
    }

    if (adminContext.role !== 'super_admin') {
      assertActorOutranksTarget(adminContext.role, targetUser.role);
    }

    await pool.query(`UPDATE "user" SET archived = $1 WHERE id = $2`, [archived, id]);

    if (archived) {
      await pool.query(`DELETE FROM "session" WHERE "userId" = $1`, [id]);
    }

    const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
    logActivity(req.user.id, `${archived ? 'Archived' : 'Restored'} user ${targetUser.email} (ID: ${id}) [Scope: ${scopeStr}]`);

    res.json({ success: true, message: archived ? 'User archived' : 'User restored' });
  } catch (err) {
    if (err.message && err.message.startsWith('SECURITY_FAULT')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError('archive_user_failure', {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: 'Failed to update archive status' });
  }
};

// @desc    Bulk archive or unarchive users
// @access  Private (admin only — actor must strictly outrank every target)
exports.bulkArchiveUsers = async (req, res) => {
  const { userIds, archived } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No users selected' });
  }
  if (userIds.length > 50) {
    return res.status(400).json({ success: false, message: 'Cannot process more than 50 users at once' });
  }

  const isArchived = archived === true || archived === "true";
  try {
    const adminContext = req.user;

    let targetQuery = 'SELECT id, role, email FROM "user" WHERE id = ANY($1)';
    let targetValues = [userIds];

    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      targetQuery += ' AND barangay_id = $2';
      targetValues.push(adminContext.barangay_id);
    } else if (!isUnscopedRole(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to bulk archive users.`);
    }

    const targetResult = await pool.query(targetQuery, targetValues);
    if (targetResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Users not found or out of scope' });
    }

    for (const targetUser of targetResult.rows) {
      if (targetUser.role === 'super_admin') {
        return res.status(403).json({ success: false, message: 'Bulk actions cannot target Super Administrator accounts.' });
      }
      if (adminContext.role !== 'super_admin') {
        assertActorOutranksTarget(adminContext.role, targetUser.role);
      }
    }

    const validatedIds = targetResult.rows.map(u => u.id);
    await pool.query(`UPDATE "user" SET archived = $1 WHERE id = ANY($2)`, [isArchived, validatedIds]);

    if (isArchived) {
      await pool.query(`DELETE FROM "session" WHERE "userId" = ANY($1)`, [validatedIds]);
    }

    const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
    const idsStr = validatedIds.length > 10 ? `${validatedIds.slice(0, 10).join(', ')}... (+${validatedIds.length - 10} more)` : validatedIds.join(', ');
    logActivity(req.user.id, `Bulk ${isArchived ? 'archived' : 'restored'} ${validatedIds.length} users (IDs: ${idsStr}) [Scope: ${scopeStr}]`);

    res.json({ success: true, message: `${validatedIds.length} users ${isArchived ? 'archived' : 'restored'}` });
  } catch (err) {
    if (err.message && err.message.startsWith('SECURITY_FAULT')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError('bulk_archive_failure', {
      userId: req.user?.id,
      targetIds: userIds,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: 'Failed to bulk update users' });
  }
};