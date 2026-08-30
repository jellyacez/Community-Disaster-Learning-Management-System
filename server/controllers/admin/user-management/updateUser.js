const pool = require("../../../config/db");
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");
const { logActivity, logError } = require("../../../utils/logger");

// @desc    Updates user demographic details and archived status
// @access  Private (admin only)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, archived } = req.body;
  
  // M-4 FIX: Use a proper RFC-5322 compatible regex instead of the weak includes("@") check.
  // The old check accepted malformed emails like "a@", "@b", and "@@".
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || !email || !emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Valid name and email are required." });
  }

  const adminContext = req.user;
  if (!adminContext || !adminContext.role) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    let query = 'UPDATE "user" SET name = $1, email = $2, archived = $3 WHERE id = $4';
    let values = [name, email, archived, id];

    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      query += ` AND barangay_id = $5`;
      values.push(adminContext.barangay_id);
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to update user details.`);
    }

    query += ' RETURNING id, name, email, "emailVerified", image, role, "banned", "banReason", "banExpires", "createdAt", "updatedAt", "twoFactorEnabled", barangay_id, archived';

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found or out of scope." });
    }

    // Revoke sessions if user was archived
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

