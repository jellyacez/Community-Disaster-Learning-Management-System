const pool = require("../../config/db");
const { auth } = require("../../utils/auth");
const crypto = require("crypto");
const { transporter } = require("../../utils/mailer");
const { getAdminPasswordResetEmail } = require("../../utils/emailTemplates");

// @desc    Updates user demographic details and archived status
// @access  Private (admin only)
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, archived } = req.body;
  
  if (!name || !email || !email.includes("@")) {
    return res.status(400).json({ error: "Valid name and email are required." });
  }

  try {
    const result = await pool.query(
      'UPDATE "user" SET name = $1, email = $2, archived = $3 WHERE id = $4 RETURNING id, name, email, "emailVerified", image, role, "banned", "banReason", "banExpires", "createdAt", "updatedAt", "twoFactorEnabled", barangay, archived',
      [name, email, archived, id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

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
    const { error } = await auth.api.setRole({
      headers: req.headers,
      body: { userId: id, role }
    });
    if (error) throw error;
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
};

// @desc    Ban a user
// @access  Private (system_admin only)
exports.banUser = async (req, res) => {
  const { id } = req.params;
  const { reason, expiresAt } = req.body;
  try {
    await auth.api.banUser({
      headers: req.headers,
      body: {
        userId: id,
        banReason: reason || 'Banned by System Administrator',
        banExpiresIn: expiresAt ? undefined : undefined
      }
    });
    res.json({ success: true, message: 'User banned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to ban user' });
  }
};

// @desc    Unban a user
// @access  Private (system_admin only)
exports.unbanUser = async (req, res) => {
  const { id } = req.params;
  try {
    await auth.api.unbanUser({
      headers: req.headers,
      body: { userId: id }
    });
    res.json({ success: true, message: 'User unbanned' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to unban user' });
  }
};

// @desc    Archive or unarchive a user
// @access  Private (system_admin only)
exports.archiveUser = async (req, res) => {
  const { id } = req.params;
  const archived = req.body.archived === true || req.body.archived === "true";
  try {
    await pool.query(`UPDATE "user" SET archived = $1 WHERE id = $2`, [archived, id]);
    res.json({ success: true, message: archived ? 'User archived' : 'User restored' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update archive status' });
  }
};

// @desc    Bulk archive or unarchive users
// @access  Private (system_admin only)
exports.bulkArchiveUsers = async (req, res) => {
  const { userIds, archived } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, error: 'No users selected' });
  }
  const isArchived = archived === true || archived === "true";
  try {
    await pool.query(`UPDATE "user" SET archived = $1 WHERE id = ANY($2)`, [isArchived, userIds]);
    res.json({ success: true, message: `${userIds.length} users ${isArchived ? 'archived' : 'restored'}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to bulk update users' });
  }
};
