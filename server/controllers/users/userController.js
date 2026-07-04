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
    
    // 1. Fetch user data before deletion for anonymization
    const userRes = await client.query('SELECT name, barangay FROM "user" WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "User not found" });
    }
    const { barangay } = userRes.rows[0];
    
    // 2. Anonymize certificates (strip PII, retain stats)
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
