const pool = require("../../../config/db");
const { auth } = require("../../../utils/auth");
const { transporter } = require("../../../utils/mailer");
const { getAdminPasswordResetEmail } = require("../../../utils/emailTemplates");
const { getOrgSettings } = require("../../../utils/settings");
const { generateSecurePassword } = require("../../../utils/passwordGenerator");
const { UNSCOPED_ACCESS_ROLES } = require("../../../config/permissions");
const { logActivity, logError } = require("../../../utils/logger");

// @desc    Resets a user's password using the better-auth admin API (auto-generates if none provided)
// @access  Private (admin only)
exports.resetUserPassword = async (req, res) => {
  const { id } = req.params;
  let { password } = req.body;

  // Auto-generate password if not provided
  let isGenerated = false;
  if (!password) {
    password = generateSecurePassword();
    isGenerated = true;
  }

  // Universally validate the final password (whether manual or auto-generated) against the strict policy
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
    // 1. Get user details to send the email with tenant scoping
    let userQuery = 'SELECT name, email, barangay_id, role FROM "user" WHERE id = $1';
    let userValues = [id];

    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      userQuery += ' AND barangay_id = $2';
      userValues.push(adminContext.barangay_id);
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to reset user passwords.`);
    }

    const userResult = await pool.query(userQuery, userValues);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found or out of scope." });
    }
    const user = userResult.rows[0];

    // 2. Hash the password manually using Better Auth's crypto and update the database directly
    // This safely bypasses the strict plugin permission checks for admin-initiated forced resets.
    const context = await auth.$context;
    const hashedPassword = await context.password.hash(password);

    const accountResult = await pool.query(
      'UPDATE "account" SET password = $1 WHERE "userId" = $2 AND "providerId" = $3',
      [hashedPassword, id, "credential"],
    );

    if (accountResult.rowCount === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot reset password. User signed up via a social provider (e.g., Google) and has no password credential.",
        });
    }

    // Revoke existing sessions on forced password reset
    await pool.query('DELETE FROM "session" WHERE "userId" = $1', [id]);

    // 3. Email the user their new password (if auto-generated)
    if (isGenerated) {
      const { orgFooterText, supportEmail } = await getOrgSettings();
      const mailOptions = getAdminPasswordResetEmail(
        user,
        password,
        orgFooterText,
        supportEmail,
      );
      await transporter.sendMail(mailOptions);
    }

    const scopeStr = adminContext.role === 'barangay_admin' ? `Barangay ${adminContext.barangay_id}` : 'Unscoped';
    logActivity(
      adminContext.id,
      `Reset password for user ${user.email} (Admin Initiated) [Scope: ${scopeStr}]`,
    );

    res.json({
      message: isGenerated
        ? "Password auto-generated and emailed to the user successfully."
        : "Password updated successfully.",
      // SECURITY: generatedPassword intentionally omitted — transmitted via email only.
    });
  } catch (err) {
    if (err.message && err.message.startsWith('SECURITY_FAULT')) {
      return res.status(403).json({ success: false, message: err.message });
    }
    logError('reset_password_failure', {
      adminId: adminContext?.id,
      targetId: id,
      message: err.message,
      stack: err.stack,
    });
    res
      .status(500)
      .json({
        success: false,
        message:
          "An internal server error occurred while resetting the password.",
      });
  }
};

