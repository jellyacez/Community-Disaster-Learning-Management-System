const pool = require("../../../config/db");
const { auth } = require("../../../utils/auth");
const { transporter } = require("../../../utils/mailer");
const { getAdminPasswordResetEmail } = require("../../../utils/emailTemplates");
const { getOrgSettings } = require("../../../utils/settings");
const { generateSecurePassword } = require("../../../utils/passwordGenerator");
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");
const { logActivity, logError } = require("../../../utils/logger");
const { assertActorOutranksTarget } = require("../../../config/roleHierarchy");

function isUnscopedRole(role) {
  return (
    role === "super_admin" ||
    (Array.isArray(UNSCOPED_ACCESS_ROLES) && UNSCOPED_ACCESS_ROLES.includes(role))
  );
}

// @desc    Resets a user's password using better-auth admin API (auto-generates if none provided)
// @access  Private (admin only)
exports.resetUserPassword = async (req, res) => {
  const { id } = req.params;
  let { password } = req.body;

  let isGenerated = false;
  if (!password) {
    password = generateSecurePassword();
    isGenerated = true;
  }

  if (!/^(?=.*[A-Z])(?=.*[!@#$%^&*_=+\-/.]).{8,}$/.test(password)) {
    return res
      .status(400)
      .json({ success: false, message: "Password does not meet complexity requirements." });
  }

  const adminContext = req.user;
  if (!adminContext || !adminContext.role) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    let userQuery = 'SELECT name, email, barangay_id, role FROM "user" WHERE id = $1';
    let userValues = [id];

    if (adminContext.role === "barangay_admin") {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      userQuery += " AND barangay_id = $2";
      userValues.push(adminContext.barangay_id);
    } else if (!isUnscopedRole(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to reset user passwords.`);
    }

    const userResult = await pool.query(userQuery, userValues);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found or out of scope." });
    }
    const user = userResult.rows[0];

    // Explicit safeguard: non-super_admin cannot touch a super_admin's password
    if (user.role === "super_admin" && adminContext.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "SECURITY_FAULT: Only a Super Administrator can reset the password of a Super Administrator account.",
      });
    }

    // Enforce rank hierarchy unless caller is super_admin
    if (adminContext.role !== "super_admin") {
      assertActorOutranksTarget(adminContext.role, user.role);
    }

    // Set the new password via Better Auth Admin API
    try {
      await auth.api.setUserPassword({
        body: {
          userId: id,
          newPassword: password,
        },
        headers: req.headers,
      });
    } catch (authApiErr) {
      // Fallback: If Better Auth admin plugin method is not enabled, update DB directly using scrypt
      const context = await auth.$context;
      const hasher = context?.password?.hash || context?.auth?.options?.password?.hash;
      
      if (typeof hasher === "function") {
        const hashedPassword = await hasher(password);
        const accountResult = await pool.query(
          'UPDATE "account" SET password = $1 WHERE "userId" = $2 AND "providerId" = $3',
          [hashedPassword, id, "credential"]
        );
        if (accountResult.rowCount === 0) {
          return res.status(400).json({
            success: false,
            message: "Cannot reset password. User signed up via a social provider and has no password credential.",
          });
        }
      } else {
        throw authApiErr;
      }
    }

    // Invalidate user sessions so they must log in with the new password
    await pool.query('DELETE FROM "session" WHERE "userId" = $1', [id]);

    let emailSent = false;
    if (isGenerated) {
      try {
        const { orgFooterText, supportEmail } = await getOrgSettings();
        const mailOptions = getAdminPasswordResetEmail(
          user,
          password,
          orgFooterText,
          supportEmail
        );
        await transporter.sendMail(mailOptions);
        emailSent = true;
      } catch (mailErr) {
        console.warn("SMTP offline during forced reset:", mailErr.message);
      }
    }

    const scopeStr = adminContext.role === "barangay_admin" ? `Barangay ${adminContext.barangay_id}` : "Unscoped";
    logActivity(
      adminContext.id,
      `Reset password for user ${user.email} (Admin Initiated) [Scope: ${scopeStr}]`
    );

    return res.json({
      success: true,
      message: isGenerated
        ? (emailSent ? "Password auto-generated and emailed to the user successfully." : "Password reset successfully. Email gateway offline.")
        : "Password updated successfully.",
      temporaryPassword: !emailSent && isGenerated ? password : undefined,
    });
  } catch (err) {
    if (err.message && err.message.startsWith("SECURITY_FAULT")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError("reset_password_failure", {
      adminId: adminContext?.id,
      targetId: id,
      message: err.message,
      stack: err.stack,
    });
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while resetting the password.",
    });
  }
};