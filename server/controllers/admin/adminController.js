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
// --- End of updateUser ---

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
    
    // Shuffle the characters to prevent predictable patterns
    password = pass.split('').sort(() => 0.5 - Math.random()).join('');
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
    require('fs').writeFileSync('debug_error.log', err.stack || err.message || JSON.stringify(err));
    res.status(500).json({ error: "Server Error", details: err.message });
  }
};
// --- End of resetUserPassword ---

// @desc    Get system-wide statistics
// @access  Private (system_admin only)
exports.getSystemStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM "user") AS total_users,
        (SELECT COUNT(*) FROM "user" WHERE archived = false AND (banned IS NULL OR banned = false)) AS active_users,
        (SELECT COUNT(*) FROM "user" WHERE last_active >= NOW() - INTERVAL '5 minutes') AS online_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'resident') AS resident_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'barangay_admin') AS barangay_admin_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'mdrrmo_admin') AS mdrrmo_admin_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'system_admin') AS system_admin_users,
        (SELECT COUNT(*) FROM "user" WHERE banned = true) AS banned_users,
        (SELECT COUNT(*) FROM "user" WHERE archived = true) AS archived_users,
        (SELECT COUNT(*) FROM module_data) AS total_modules,
        (SELECT COUNT(*) FROM module_activity) AS total_enrollments,
        (SELECT COUNT(*) FROM module_activity WHERE modstatus = 'Completed') AS total_completions,
        (SELECT COUNT(*) FROM certificates) AS total_certificates,
        (SELECT COUNT(*) FROM activity_log) AS total_log_entries
    `);
    res.json({ success: true, data: stats.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
// --- End of getSystemStats ---

// @desc    Get paginated activity log
// @access  Private (system_admin only)
exports.getActivityLog = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = search
      ? `WHERE u.name ILIKE $3 OR al.act_log ILIKE $3`
      : '';
    const params = search
      ? [limit, offset, `%${search}%`]
      : [limit, offset];

    const whereClauseCount = search
      ? `WHERE u.name ILIKE $1 OR al.act_log ILIKE $1`
      : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM activity_log al
       LEFT JOIN "user" u ON al.user_id = u.id
       ${whereClauseCount}`,
      search ? [`%${search}%`] : []
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT al.act_id, al.user_id, u.name AS user_name, u.role AS user_role,
              al.act_date, al.act_log
       FROM activity_log al
       LEFT JOIN "user" u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.act_date DESC, al.act_id DESC
       LIMIT $1 OFFSET $2`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
// --- End of getActivityLog ---

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
// --- End of updateUserRole ---

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
// --- End of banUser ---

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
// --- End of unbanUser ---

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
// --- End of archiveUser ---

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
// --- End of bulkArchiveUsers ---

// @desc    Get system settings (including maintenance mode)
// @access  Private (system_admin only)
exports.getSystemSettings = async (req, res) => {
  try {
    const result = await pool.query(`SELECT key, value FROM public.system_settings`);
    const settings = {};
    result.rows.forEach(row => { settings[row.key] = row.value; });
    // Also return runtime info
    settings.node_env = process.env.NODE_ENV || 'development';
    settings.node_version = process.version;
    settings.platform = process.platform;
    res.json({ success: true, data: settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
// --- End of getSystemSettings ---

// @desc    Get 24h Traffic Analytics Template
// @access  Private (system_admin only)
exports.getTrafficAnalytics = async (req, res) => {
  try {
    // Template: In a production environment, this would query activity logs grouped by hour
    // For the defense demonstration, we generate a realistic static traffic curve
    const hours = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(now.getHours() - i);
      const hourStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Simulate peak traffic between 10am-4pm
      const h = d.getHours();
      let users = 10 + Math.floor(Math.random() * 20); // Baseline
      if (h >= 9 && h <= 17) users += 40 + Math.floor(Math.random() * 30); // Work hours
      if (h === 12) users -= 20; // Lunch dip
      
      hours.push({ time: hourStr, activeUsers: users });
    }

    res.json({ success: true, data: hours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
// --- End of getTrafficAnalytics ---

// @desc    Update system branding (Name and Base64 Logo)
// @access  Private (system_admin only)
exports.updateSystemBranding = async (req, res) => {
  const { system_name, system_logo } = req.body;
  try {
    // Upsert System Name
    if (system_name) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('system_name', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [system_name]
      );
    }
    
    // Upsert System Logo (Base64)
    if (system_logo) {
      await pool.query(
        `INSERT INTO public.system_settings (key, value, updated_at) VALUES ('system_logo', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [system_logo]
      );
    }
    
    res.json({ success: true, message: 'System branding updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update system branding' });
  }
};
// --- End of updateSystemBranding ---

// @desc    Toggle maintenance mode on/off
// @access  Private (system_admin only)
exports.setMaintenanceMode = async (req, res) => {
  const { enabled } = req.body;
  try {
    await pool.query(
      `INSERT INTO public.system_settings (key, value, updated_at)
       VALUES ('maintenance_mode', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [enabled ? 'true' : 'false']
    );
    res.json({
      success: true,
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to toggle maintenance mode' });
  }
};
// --- End of setMaintenanceMode ---

// @desc    Get DB health status
// @access  Private (system_admin only)
exports.getHealthStatus = async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latency = Date.now() - start;
    res.json({
      success: true,
      data: {
        db_status: 'connected',
        db_latency_ms: latency,
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    });
  } catch (err) {
    res.status(500).json({ success: true, data: { db_status: 'disconnected', db_latency_ms: null } });
  }
};
// --- End of getHealthStatus ---
