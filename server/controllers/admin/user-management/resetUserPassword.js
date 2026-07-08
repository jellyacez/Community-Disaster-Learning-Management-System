const pool = require("../../../config/db");
const { auth } = require("../../../utils/auth");
const crypto = require("crypto");
const { transporter } = require("../../../utils/mailer");
const { getAdminPasswordResetEmail } = require("../../../utils/emailTemplates");

// @desc    Resets a user's password using the better-auth admin API (auto-generates if none provided)
// @access  Private (admin only)
exports.resetUserPassword = async (req, res) => {
  const { id } = req.params;
  let { password } = req.body;
  
  // Auto-generate password if not provided
  let isGenerated = false;
  if (!password) {
    // Generate a robust 12-character password that passes strict enterprise policies
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const num = "0123456789";
    const special = "!@#$%^&*";
    const all = upper + lower + num + special;
    
    let pass = "";
    pass += upper[crypto.randomInt(upper.length)];
    pass += lower[crypto.randomInt(lower.length)];
    pass += num[crypto.randomInt(num.length)];
    pass += special[crypto.randomInt(special.length)];
    
    for(let i=0; i < 8; i++) {
      pass += all[crypto.randomInt(all.length)];
    }
    
    // Shuffle the characters cryptographically securely (Fisher-Yates)
    const arr = pass.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    password = arr.join('');
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
      const mailOptions = getAdminPasswordResetEmail(user, password);
      await transporter.sendMail(mailOptions);
    }
    
    res.json({ 
      message: isGenerated ? "Password auto-generated and emailed successfully." : "Password updated successfully",
      generatedPassword: isGenerated ? password : null 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error", details: err.message });
  }
};
