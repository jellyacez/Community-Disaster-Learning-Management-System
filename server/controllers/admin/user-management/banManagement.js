const pool = require("../../../config/db");
const { logActivity, logError } = require("../../../utils/logger");
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");
const { assertActorOutranksTarget } = require("../../../config/roleHierarchy");
const { sendAccountNotice } = require("../../../services/accountNoticeService");

function isUnscopedRole(role) {
  return role === "super_admin" || (Array.isArray(UNSCOPED_ACCESS_ROLES) && UNSCOPED_ACCESS_ROLES.includes(role));
}

// @desc    Ban a user
// @access  Private (admin only — actor must strictly outrank target)
exports.banUser = async (req, res) => {
  const { id } = req.params;

  try {
    const adminContext = req.user;

        if (String(adminContext.id) === String(id)) {
          return res.status(403).json({
            success: false,
            message: "You cannot ban your own account.",
          });
        }

        if (
          !req.body ||
          typeof req.body !== "object" ||
          Array.isArray(req.body)
        ) {
          return res.status(400).json({
            success: false,
            message: "Send a JSON body containing the ban details.",
          });
        }

        const { reason, expiresAt } = req.body;

        if (reason !== undefined && typeof reason !== "string") {
          return res.status(400).json({
            success: false,
            message: "The ban reason must be text.",
          });
        }

        const banReason =
          reason?.trim() || "Banned by System Administrator";

        const banExpires = expiresAt ? new Date(expiresAt) : null;

        if (banExpires && Number.isNaN(banExpires.getTime())) {
          return res.status(400).json({
            success: false,
            message: "The ban expiration date is invalid.",
          });
        }
    let targetQuery = 'SELECT id, role, email FROM "user" WHERE id = $1';
    let targetValues = [id];

    if (adminContext.role === "barangay_admin") {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      targetQuery += " AND barangay_id = $2";
      targetValues.push(adminContext.barangay_id);
    } else if (!isUnscopedRole(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to ban users.`);
    }

    const targetResult = await pool.query(targetQuery, targetValues);
    if (targetResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found or out of scope" });
    }

    const targetUser = targetResult.rows[0];

    if (targetUser.role === "super_admin") {
      return res.status(403).json({ success: false, message: "Super Administrator accounts cannot be deactivated." });
    }

    if (adminContext.role !== "super_admin") {
      assertActorOutranksTarget(adminContext.role, targetUser.role);
    }

    await pool.query(
      `UPDATE "user" SET banned = true, "banReason" = $1, "banExpires" = $2 WHERE id = $3`,
      [banReason, banExpires, id]
    );

    await pool.query(`DELETE FROM "session" WHERE "userId" = $1`, [id]);

    const scopeStr = adminContext.role === "barangay_admin" ? `Barangay ${adminContext.barangay_id}` : "Unscoped";
    logActivity(req.user.id, `Banned user ${targetUser.email} (ID: ${id}) for: ${banReason} [Scope: ${scopeStr}]`);
    sendAccountNotice(id, "banned", { reason: banReason, expiresAt: banExpires });
    res.json({ success: true, message: "User banned" });
  } catch (err) {
    if (err.message && err.message.startsWith("SECURITY_FAULT")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError("ban_user_failure", {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: "An internal server error occurred while banning the user." });
  }
};

// @desc    Unban a user
// @access  Private (admin only — actor must strictly outrank target)
exports.unbanUser = async (req, res) => {
  const { id } = req.params;
  try {
    const adminContext = req.user;

        if (String(adminContext.id) === String(id)) {
          return res.status(403).json({
            success: false,
            message: "You cannot unban your own account.",
          });
        }

    let targetQuery = 'SELECT id, role, email FROM "user" WHERE id = $1';
    let targetValues = [id];

    if (adminContext.role === "barangay_admin") {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      targetQuery += " AND barangay_id = $2";
      targetValues.push(adminContext.barangay_id);
    } else if (!isUnscopedRole(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to unban users.`);
    }

    const targetResult = await pool.query(targetQuery, targetValues);
    if (targetResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found or out of scope" });
    }

    const targetUser = targetResult.rows[0];

    if (adminContext.role !== "super_admin") {
      assertActorOutranksTarget(adminContext.role, targetUser.role);
    }

    await pool.query(
      `UPDATE "user" SET banned = false, "banReason" = NULL, "banExpires" = NULL WHERE id = $1`,
      [id]
    );

    const scopeStr = adminContext.role === "barangay_admin" ? `Barangay ${adminContext.barangay_id}` : "Unscoped";
    logActivity(req.user.id, `Unbanned user ${targetUser.email} (ID: ${id}) [Scope: ${scopeStr}]`);
    sendAccountNotice(id, "unbanned");
    res.json({ success: true, message: "User unbanned" });
  } catch (err) {
    if (err.message && err.message.startsWith("SECURITY_FAULT")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError("unban_user_failure", {
      userId: req.user?.id,
      targetId: id,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ success: false, message: "An internal server error occurred while unbanning the user." });
  }
};
