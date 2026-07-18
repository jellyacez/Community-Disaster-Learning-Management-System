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
    
    if (!UNSCOPED_ACCESS_ROLES.includes(req.user.role)) {
      if (req.user.role === 'barangay_admin') {
        query += ` AND barangay = $3`;
        values.push(req.user.barangay);
      } else {
        return res.status(403).json({ success: false, error: 'Unauthorized to archive users' });
      }
    }
    
    query += ` RETURNING email`;
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found or out of scope' });
    }
    
    // Immediately revoke sessions if archived
    if (archived) {
      await pool.query(`DELETE FROM "session" WHERE "userId" = $1`, [id]);
    }
    
    if (result.rows.length > 0) {
      logActivity(req.user.id, `${archived ? 'Archived' : 'Restored'} user ${result.rows[0].email}`);
    }

    res.json({ success: true, message: archived ? 'User archived' : 'User restored' });
  } catch (err) {
    logError('archive_user_failure', {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, error: 'Failed to update archive status' });
  }
};

// @desc    Bulk archive or unarchive users
// @access  Private (system_admin only)
exports.bulkArchiveUsers = async (req, res) => {
  const { userIds, archived } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, error: 'No users selected' });
  }
  if (userIds.length > 100) {
    return res.status(400).json({ success: false, error: 'Cannot process more than 100 users at once' });
  }
  
  const isArchived = archived === true || archived === "true";
  try {
    let query = `UPDATE "user" SET archived = $1 WHERE id = ANY($2)`;
    let values = [isArchived, userIds];
    
    if (!UNSCOPED_ACCESS_ROLES.includes(req.user.role)) {
      if (req.user.role === 'barangay_admin') {
        query += ` AND barangay = $3`;
        values.push(req.user.barangay);
      } else {
        return res.status(403).json({ success: false, error: 'Unauthorized to bulk archive users' });
      }
    }
    
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Users not found or out of scope' });
    }
    
    // Immediately revoke sessions for all archived users
    if (isArchived) {
      await pool.query(`DELETE FROM "session" WHERE "userId" = ANY($1)`, [userIds]);
    }

    logActivity(req.user.id, `Bulk ${isArchived ? 'archived' : 'restored'} ${userIds.length} users`);

    res.json({ success: true, message: `${userIds.length} users ${isArchived ? 'archived' : 'restored'}` });
  } catch (err) {
    logError('bulk_archive_failure', {
      userId: req.user?.id,
      targetIds: userIds,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, error: 'Failed to bulk update users' });
  }
};
