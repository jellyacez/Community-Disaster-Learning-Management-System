const pool = require("../../../config/db");

// @desc    Update a user's role
// @access  Private (system_admin only)
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  const validRoles = ['resident', 'barangay_admin', 'mdrrmo_admin', 'system_admin'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role' });
  }
  try {
    // We update the DB directly instead of using auth.api.setRole because 
    // the Better Auth admin plugin enforces a rigid session check that rejects 
    // custom adminRole hierarchies in some versions.
    // The endpoint is fully secured by our adminMiddleware.
    const result = await pool.query('UPDATE "user" SET role = $1 WHERE id = $2 RETURNING id', [role, id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    console.error("Role Update Error:", err);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
};
