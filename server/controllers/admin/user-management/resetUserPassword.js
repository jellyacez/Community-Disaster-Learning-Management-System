const pool = require("../../../config/db");
const { auth } = require("../../../utils/auth");
const crypto = require("crypto");
const { transporter } = require("../../../utils/mailer");
const { getAdminPasswordResetEmail } = require("../../../utils/emailTemplates");
const { getOrgSettings } = require("../../../utils/settings");
const { generateSecurePassword } = require("../../../utils/passwordGenerator");

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
    return res.status(400).json({ error: "Password does not meet complexity requirements." });
  }

  try {
    // 1. Get user details to send the email
    const userResult = await pool.query('SELECT name, email FROM "user" WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userResult.rows[0];

    // 2. Hash the password manually using Better Auth's crypto and update the database directly
    // This safely bypasses the strict plugin permission checks for admin-initiated forced resets.
    const context = await auth.$context;
    const hashedPassword = await context.password.hash(password);
    
    const accountResult = await pool.query('UPDATE "account" SET password = $1 WHERE "userId" = $2 AND "providerId" = $3', [hashedPassword, id, 'credential']);
    
    if (accountResult.rowCount === 0) {
      return res.status(400).json({ error: "Cannot reset password. User signed up via a social provider (e.g., Google) and has no password credential." });
    }

    // 3. Email the user their new password (if auto-generated)
    if (isGenerated) {
      const { orgFooterText, supportEmail } = await getOrgSettings();
      const mailOptions = getAdminPasswordResetEmail(user, password, orgFooterText, supportEmail);
      await transporter.sendMail(mailOptions);
    }
    
    require('../../../utils/logger').logActivity(req.user.id, `Reset password for user ${user.email} (Admin Initiated)`);
    
    res.json({ 
      message: isGenerated
        ? "Password auto-generated and emailed to the user successfully."
        : "Password updated successfully."
      // SECURITY: generatedPassword intentionally omitted — transmitted via email only.
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "An internal server error occurred while resetting the password." });
  }
};
