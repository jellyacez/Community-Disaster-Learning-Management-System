const pool = require("../../../config/db");
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");
const { logActivity, logError } = require("../../../utils/logger");
const { assertActorOutranksTarget } = require("../../../config/roleHierarchy");

function isUnscopedRole(role) {
  return role === "super_admin" || (Array.isArray(UNSCOPED_ACCESS_ROLES) && UNSCOPED_ACCESS_ROLES.includes(role));
}

// @desc    Updates user demographic details and archived status
// @access  Private (admin only — actor must strictly outrank target)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, archived } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Valid name and email are required." });
  }

  const adminContext = req.user;
  if (!adminContext || !adminContext.role) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  // Anti-Lockout Safeguard: Cannot archive or ban yourself
  if (String(adminContext.id) === String(id) && (archived === true || archived === "true")) {
    return res.status(400).json({
      success: false,
      message: "Action prohibited: You cannot archive or deactivate your own administrative account.",
    });
  }

  try {
    let fetchQuery = 'SELECT id, role FROM "user" WHERE id = $1';
    let fetchValues = [id];

    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      fetchQuery += ' AND barangay_id = $2';
      fetchValues.push(adminContext.barangay_id);
    } else if (!isUnscopedRole(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to update user details.`);
    }

    const fetchResult = await pool.query(fetchQuery, fetchValues);
    if (fetchResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found or out of scope." });
    }

    const targetUser = fetchResult.rows[0];

    // Non-super_admin cannot edit a super_admin
    if (targetUser.role === 'super_admin' && adminContext.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: "SECURITY_FAULT: Only a Super Admin can modify another Super Admin account.",
      });
    }

    // super_admin outranks all subordinate roles; otherwise enforce standard hierarchy
    if (adminContext.role !== 'super_admin') {
      assertActorOutranksTarget(adminContext.role, targetUser.role);
    }

    let updateQuery = 'UPDATE "user" SET name = $1, email = $2, archived = $3 WHERE id = $4';
    let updateValues = [name, email, archived, id];

    if (adminContext.role === 'barangay_admin') {
      updateQuery += ' AND barangay_id = $5';
      updateValues.push(adminContext.barangay_id);
    }

    updateQuery += ' RETURNING id, name, email, "emailVerified", image, role, "banned", "banReason", "banExpires", "createdAt", "updatedAt", "twoFactorEnabled", barangay_id, archived';

    const result = await pool.query(updateQuery, updateValues);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found or out of scope." });
    }

    if (archived === true || archived === "true") {
      await pool.query('DELETE FROM "session" WHERE "userId" = $1', [id]);
    }

    const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
    logActivity(adminContext.id, `Updated details for user ${email} (ID: ${id}) [Scope: ${scopeStr}]`);

    res.json(result.rows[0]);
  } catch (err) {
    if (err.message && err.message.startsWith('SECURITY_FAULT')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError('update_user_failure', {
      adminId: adminContext?.id,
      targetId: id,
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ success: false, message: "Failed to update user details." });
  }
};