const pool = require("../../../config/db");

// @desc    Archive or unarchive a user
// @access  Private (system_admin only)
exports.archiveUser = async (req, res) => {
  const { id } = req.params;
  const archived = req.body.archived === true || req.body.archived === "true";
  try {
    await pool.query(`UPDATE "user" SET archived = $1 WHERE id = $2`, [archived, id]);
    
    // Immediately revoke sessions if archived
    if (archived) {
      await pool.query(`DELETE FROM "session" WHERE "userId" = $1`, [id]);
    }

    res.json({ success: true, message: archived ? 'User archived' : 'User restored' });
  } catch (err) {
    console.error(err);
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
  const isArchived = archived === true || archived === "true";
  try {
    await pool.query(`UPDATE "user" SET archived = $1 WHERE id = ANY($2)`, [isArchived, userIds]);
    
    // Immediately revoke sessions for all archived users
    if (isArchived) {
      await pool.query(`DELETE FROM "session" WHERE "userId" = ANY($1)`, [userIds]);
    }

    res.json({ success: true, message: `${userIds.length} users ${isArchived ? 'archived' : 'restored'}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to bulk update users' });
  }
};
