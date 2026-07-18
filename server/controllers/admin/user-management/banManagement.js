const pool = require("../../../config/db");
const { logActivity, logError } = require('../../../utils/logger');
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");

// @desc    Ban a user
// @access  Private (system_admin only)
exports.banUser = async (req, res) => {
  const { id } = req.params;
  const { reason, expiresAt } = req.body;
  try {
    const banReason = reason || 'Banned by System Administrator';
    const banExpires = expiresAt ? new Date(expiresAt) : null;
    let query = `UPDATE "user" SET banned = true, "banReason" = $1, "banExpires" = $2 WHERE id = $3`;
    let values = [banReason, banExpires, id];
    
    if (!UNSCOPED_ACCESS_ROLES.includes(req.user.role)) {
      if (req.user.role === 'barangay_admin') {
        query += ` AND barangay = $4`;
        values.push(req.user.barangay);
      } else {
        return res.status(403).json({ success: false, error: 'Unauthorized to ban users' });
      }
    }
    
    query += ` RETURNING email`;
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found or out of scope' });
    }
    
    // Immediately revoke sessions for banned user
    await pool.query(`DELETE FROM "session" WHERE "userId" = $1`, [id]);

    logActivity(req.user.id, `Banned user ${result.rows[0].email} for: ${banReason}`);
    res.json({ success: true, message: 'User banned' });
  } catch (err) {
    logError('ban_user_failure', {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, error: 'An internal server error occurred while banning the user.' });
  }
};

// @desc    Unban a user
// @access  Private (system_admin only)
exports.unbanUser = async (req, res) => {
  const { id } = req.params;
  try {
    let query = `UPDATE "user" SET banned = false, "banReason" = NULL, "banExpires" = NULL WHERE id = $1`;
    let values = [id];
    
    if (!UNSCOPED_ACCESS_ROLES.includes(req.user.role)) {
      if (req.user.role === 'barangay_admin') {
        query += ` AND barangay = $2`;
        values.push(req.user.barangay);
      } else {
        return res.status(403).json({ success: false, error: 'Unauthorized to unban users' });
      }
    }
    
    query += ` RETURNING email`;
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found or out of scope' });
    }

    logActivity(req.user.id, `Unbanned user ${result.rows[0].email}`);
    res.json({ success: true, message: 'User unbanned' });
  } catch (err) {
    logError('unban_user_failure', {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, error: 'An internal server error occurred while unbanning the user.' });
  }
};
