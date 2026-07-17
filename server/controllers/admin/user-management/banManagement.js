const pool = require("../../../config/db");

// @desc    Ban a user
// @access  Private (system_admin only)
exports.banUser = async (req, res) => {
  const { id } = req.params;
  const { reason, expiresAt } = req.body;
  try {
    const banReason = reason || 'Banned by System Administrator';
    const result = await pool.query(
      'UPDATE "user" SET "banned" = true, "banReason" = $1, "banExpires" = $2 WHERE id = $3 RETURNING email',
      [banReason, expiresAt ? new Date(expiresAt) : null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    require('../../../utils/logger').logActivity(req.user.id, `Banned user ${result.rows[0].email} for: ${banReason}`);
    res.json({ success: true, message: 'User banned' });
  } catch (err) {
    console.error("Ban Error:", err);
    res.status(500).json({ success: false, error: 'An internal server error occurred while banning the user.' });
  }
};

// @desc    Unban a user
// @access  Private (system_admin only)
exports.unbanUser = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE "user" SET "banned" = false, "banReason" = null, "banExpires" = null WHERE id = $1 RETURNING email',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    require('../../../utils/logger').logActivity(req.user.id, `Unbanned user ${result.rows[0].email}`);
    res.json({ success: true, message: 'User unbanned' });
  } catch (err) {
    console.error("Unban Error:", err);
    res.status(500).json({ success: false, error: 'An internal server error occurred while unbanning the user.' });
  }
};
