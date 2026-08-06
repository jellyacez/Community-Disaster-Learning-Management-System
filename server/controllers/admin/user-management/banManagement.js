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
    
    const adminContext = req.user;
    
    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      query += ` AND barangay_id = $4`;
      values.push(adminContext.barangay_id);
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to ban users.`);
    }
    
    query += ` RETURNING email`;
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found or out of scope' });
    }
    
    // Immediately revoke sessions for banned user
    await pool.query(`DELETE FROM "session" WHERE "userId" = $1`, [id]);

    const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
    logActivity(req.user.id, `Banned user ${result.rows[0].email} (ID: ${id}) for: ${banReason} [Scope: ${scopeStr}]`);
    res.json({ success: true, message: 'User banned' });
  } catch (err) {
    if (err.message && err.message.startsWith('SECURITY_FAULT')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError('ban_user_failure', {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: 'An internal server error occurred while banning the user.' });
  }
};

// @desc    Unban a user
// @access  Private (system_admin only)
exports.unbanUser = async (req, res) => {
  const { id } = req.params;
  try {
    let query = `UPDATE "user" SET banned = false, "banReason" = NULL, "banExpires" = NULL WHERE id = $1`;
    let values = [id];
    
    const adminContext = req.user;
    
    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      query += ` AND barangay_id = $2`;
      values.push(adminContext.barangay_id);
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to unban users.`);
    }
    
    query += ` RETURNING email`;
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found or out of scope' });
    }

    const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
    logActivity(req.user.id, `Unbanned user ${result.rows[0].email} (ID: ${id}) [Scope: ${scopeStr}]`);
    res.json({ success: true, message: 'User unbanned' });
  } catch (err) {
    if (err.message && err.message.startsWith('SECURITY_FAULT')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError('unban_user_failure', {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: 'An internal server error occurred while unbanning the user.' });
  }
};

