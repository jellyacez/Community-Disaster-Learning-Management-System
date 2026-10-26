const pool = require("../../../config/db");
const { logActivity, logError } = require("../../../utils/logger");
const UserService = require("../../../services/users/UserService");

// @desc    Admin hard delete a user's account and anonymize certificates
// @access  Private (system_admin and super_admin only)
exports.deleteAccount = async (req, res) => {
  // Allow both super_admin and system_admin
  if (req.user.role !== 'system_admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized to permanently delete users.' });
  }

  const { id } = req.params;
  const { confirm } = req.body;

  if (req.user.id === id) {
    return res.status(400).json({ success: false, message: 'Cannot hard-delete your own account through this endpoint. Please use the self-service deletion in your account settings.' });
  }

  if (confirm !== true) {
    return res.status(400).json({ success: false, message: 'Confirmation flag is required for this destructive action.' });
  }

  try {
    // Fetch user details for logging before they are deleted
    const userRes = await pool.query('SELECT u.email, u.role, b.name AS barangay_name FROM "user" u LEFT JOIN barangays b ON u.barangay_id = b.id WHERE u.id = $1', [id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const { email, role: targetRole, barangay_name } = userRes.rows[0];

    // Protect super_admin accounts and protect system_admins from non-super admins
    if (targetRole === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Super administrator accounts cannot be deleted through this endpoint.' });
    }

    if (targetRole === 'system_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'System administrator accounts can only be deleted by a Super Administrator.' });
    }

    // Call the existing pipeline
    await UserService.deleteAccount(id);

    logActivity(req.user.id, `Permanently deleted user ${email} from ${barangay_name || 'No Barangay'}`);

    res.json({ success: true, message: 'User permanently deleted.' });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    logError('admin_delete_account_failure', {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: 'An internal server error occurred while deleting the user.' });
  }
};