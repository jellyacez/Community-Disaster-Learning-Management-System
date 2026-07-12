const pool = require("../../config/db");

// @desc    Retrieves a list of authentication providers linked to the current user
// @access  Private
exports.getProviders = async (req, res) => {
  try {
    const result = await pool.query('SELECT "providerId" FROM account WHERE "userId" = $1', [req.user.id]);
    const providers = result.rows.map(r => r.providerId);
    res.json({ providers });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
// --- End of getProviders ---

// @desc    Completes a new user's profile by saving required demographic information
// @access  Private
exports.onboarding = async (req, res) => {
  const { name, barangay } = req.body;
  if (!name || !barangay)
    return res.status(400).json({ error: "Name and Barangay are required" });

  try {
    await pool.query(`UPDATE "user" SET name = $1, barangay = $2 WHERE id = $3`, [
      name,
      barangay,
      req.user.id,
    ]);
    res.json({ success: true, message: "Profile updated successfully!" });
  } catch (err) {
    console.error("Onboarding error:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of onboarding ---

// @desc    Retrieves all registered users and their details for the admin dashboard
// @access  Private (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const role = req.query.role || "";
    const status = req.query.status || "";
    const barangay = req.query.barangay || "";

    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (role) {
      conditions.push(`role = $${idx}`);
      values.push(role);
      idx++;
    }
    if (barangay) {
      conditions.push(`barangay = $${idx}`);
      values.push(barangay);
      idx++;
    }
    if (status === "active") {
      conditions.push(`(archived = false OR archived IS NULL) AND (banned = false OR banned IS NULL)`);
    } else if (status === "banned") {
      conditions.push(`banned = true`);
    } else if (status === "archived") {
      conditions.push(`archived = true`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(`SELECT COUNT(*) FROM "user" ${where}`, values);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT id, name, email, "emailVerified", image, role, "banned", "banReason", "banExpires", "createdAt", "updatedAt", "twoFactorEnabled", barangay, archived
       FROM "user" ${where}
       ORDER BY "createdAt" DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    res.json({
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};
// --- End of getAllUsers ---

// @desc    Hard deletes a user's account and anonymizes their certificates (Right to Be Forgotten)
// @access  Private
exports.deleteAccount = async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    
    await client.query('BEGIN');
    
    // 1. fetch user data for anonymization
    const userRes = await client.query('SELECT name, barangay FROM "user" WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "User not found" });
    }
    const { barangay } = userRes.rows[0];
    
    // 2. anonymize certificates
    await client.query(`
      UPDATE certificates 
      SET user_id = NULL, 
          anonymized_name = 'Archived Resident', 
          barangay = $1
      WHERE user_id = $2
    `, [barangay, userId]);
    
    // 3. Hard Delete tied records (assuming these tables exist and use user_id)
    await client.query('DELETE FROM activity_log WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM module_activity WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM user_step_progress WHERE user_id = $1', [userId]).catch(() => {});
    await client.query('DELETE FROM results WHERE user_id = $1', [userId]).catch(() => {});
    
    // 4. Delete core Better Auth tables
    await client.query('DELETE FROM "session" WHERE "userId" = $1', [userId]);
    await client.query('DELETE FROM "account" WHERE "userId" = $1', [userId]);
    
    // 5. Delete core user row
    await client.query('DELETE FROM "user" WHERE id = $1', [userId]);
    
    await client.query('COMMIT');
    res.json({ success: true, message: "Account and associated data permanently deleted." });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Account deletion error:", err.message);
    res.status(500).json({ error: "Server Error during deletion pipeline" });
  } finally {
    client.release();
  }
};
// --- End of deleteAccount ---

// @desc    Retrieves the certificate control number for the current user
// @access  Private
exports.getCertificateData = async (req, res) => {
  try {
    // req.user.id is securely provided by betterAuthMiddleware
    const userId = req.user.id; 

    const query = `
      SELECT "certControl_no" 
      FROM "user" 
      WHERE id = $1
    `;
    
    const { rows } = await pool.query(query, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // Send the 4-digit string back to the React frontend
    res.json({
      certControl_no: rows[0].certControl_no
    });

  } catch (err) {
    console.error("Error fetching certificate data:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of getCertificateData ---

// @desc    Exports the current user's profile, activity, and learning data as JSON
// @access  Private
exports.exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch basic user profile
    const userRes = await pool.query('SELECT name, email, role, barangay, "createdAt", "updatedAt" FROM "user" WHERE id = $1', [userId]);
    
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Fetch activity log (if exists)
    const logRes = await pool.query('SELECT act_date, act_log, act_type FROM activity_log WHERE user_id = $1', [userId]).catch(() => ({ rows: [] }));
    
    // Fetch certificates (if exists)
    const certRes = await pool.query('SELECT * FROM certificates WHERE user_id = $1', [userId]).catch(() => ({ rows: [] }));
    
    // Fetch progress (if exists)
    const progressRes = await pool.query('SELECT * FROM user_step_progress WHERE user_id = $1', [userId]).catch(() => ({ rows: [] }));
    
    const exportData = {
      profile: userRes.rows[0],
      activityLogs: logRes.rows,
      certificates: certRes.rows,
      learningProgress: progressRes.rows,
      exportedAt: new Date().toISOString()
    };
    
    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-disposition', `attachment; filename=BacolorLMS_Data_Export_${date}.json`);
    res.setHeader('Content-type', 'application/json');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    console.error("Export error:", err.message);
    res.status(500).json({ error: "Failed to export data" });
  }
};
// --- End of exportUserData ---

// @desc    Get user's notification settings
// @access  Private
exports.getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await pool.query('SELECT settings FROM "user" WHERE id = $1', [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Send back settings or the default object
    res.json(rows[0].settings || { announcements: true, reminders: true });
  } catch (err) {
    console.error("Error fetching settings:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of getUserSettings ---

// @desc    Update user's notification settings
// @access  Private
exports.updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const newSettings = req.body;
    
    await pool.query(
      'UPDATE "user" SET settings = $1 WHERE id = $2',
      [newSettings, userId]
    );
    
    res.json({ success: true, settings: newSettings });
  } catch (err) {
    console.error("Error updating settings:", err.message);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of updateUserSettings ---
