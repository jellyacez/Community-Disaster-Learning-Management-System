const pool = require("../../../config/db");
const { logActivity, logError } = require('../../../utils/logger');
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");

// @desc    Archive or unarchive a user
// @access  Private (system_admin only)
exports.archiveUser = async (req, res) => {
  const { id } = req.params;
  const archived = req.body.archived === true || req.body.archived === "true";
  try {
    let query = `UPDATE "user" SET archived = $1 WHERE id = $2`;
    let values = [archived, id];
    
    const adminContext = req.user;
    
    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      query += ` AND barangay_id = $3`;
      values.push(adminContext.barangay_id);
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to archive users.`);
    }

    
    query += ` RETURNING email`;
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found or out of scope' });
    }
    
    // Immediately revoke sessions if archived
    if (archived) {
      await pool.query(`DELETE FROM "session" WHERE "userId" = $1`, [id]);
    }
    
    if (result.rows.length > 0) {
      const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
      logActivity(req.user.id, `${archived ? 'Archived' : 'Restored'} user ${result.rows[0].email} (ID: ${id}) [Scope: ${scopeStr}]`);
    }

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
// @access  Private (system_admin only)
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
    let query = `UPDATE "user" SET archived = $1 WHERE id = ANY($2)`;
    let values = [isArchived, userIds];
    
    const adminContext = req.user;
    
    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      query += ` AND barangay_id = $3`;
      values.push(adminContext.barangay_id);
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to bulk archive users.`);
    }
    
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Users not found or out of scope' });
    }
    
    // Immediately revoke sessions for all archived users
    if (isArchived) {
      await pool.query(`DELETE FROM "session" WHERE "userId" = ANY($1)`, [userIds]);
    }

    const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
    const idsStr = userIds.length > 10 ? `${userIds.slice(0, 10).join(', ')}... (+${userIds.length - 10} more)` : userIds.join(', ');
    logActivity(req.user.id, `Bulk ${isArchived ? 'archived' : 'restored'} ${userIds.length} users (IDs: ${idsStr}) [Scope: ${scopeStr}]`);

    res.json({ success: true, message: `${userIds.length} users ${isArchived ? 'archived' : 'restored'}` });
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

