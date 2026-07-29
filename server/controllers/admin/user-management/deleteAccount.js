const pool = require("../../../config/db");
const { logActivity, logError } = require("../../../utils/logger");
const UserService = require("../../../services/users/UserService");

// @desc    Admin hard delete a user's account and anonymize certificates
// @access  Private (system_admin only)
exports.deleteAccount = async (req, res) => {
  // Explicit double-gate: Only system_admin can do this
  if (req.user.role !== 'system_admin') {
    return res.status(403).json({ success: false, error: 'Unauthorized to permanently delete users.' });
  }

  const { id } = req.params;
  const { confirm } = req.body;

  if (req.user.id === id) {
    return res.status(400).json({ success: false, error: 'Cannot hard-delete your own account through this endpoint. Please use the self-service deletion in your account settings.' });
  }

  if (confirm !== true) {
    return res.status(400).json({ success: false, error: 'Confirmation flag is required for this destructive action.' });
  }

  try {
    // Fetch user details for logging before they are deleted
    const userRes = await pool.query('SELECT email, barangay FROM "user" WHERE id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    const { email, barangay } = userRes.rows[0];

    // Call the existing pipeline
    await UserService.deleteAccount(id);

    logActivity(req.user.id, `Permanently deleted user ${email} from ${barangay}`);

    res.json({ success: true, message: 'User permanently deleted.' });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    logError('admin_delete_account_failure', {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, error: 'An internal server error occurred while deleting the user.' });
  }
};
