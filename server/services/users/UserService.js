const pool = require("../../config/db");

class UserService {
  async getProviders(userId) {
    const result = await pool.query('SELECT "providerId" FROM account WHERE "userId" = $1', [userId]);
    return result.rows.map(r => r.providerId);
  }

  async onboarding(userId, name, barangay) {
    if (!name || !barangay) throw new Error("MISSING_DATA");

    await pool.query(`UPDATE "user" SET name = $1, barangay = $2 WHERE id = $3`, [
      name,
      barangay,
      userId,
    ]);
  }

  async getAllUsers(page = 1, limit = 10, search = "", role = "", status = "", barangay = "") {
    const offset = (page - 1) * limit;
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

    return {
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteAccount(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. fetch user data for anonymization
      const userRes = await client.query('SELECT name, barangay FROM "user" WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) {
        throw new Error("NOT_FOUND");
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
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getCertificateData(userId) {
    const query = `
      SELECT "certControl_no" 
      FROM "user" 
      WHERE id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    
    if (rows.length === 0) {
      throw new Error("NOT_FOUND");
    }
    
    return rows[0].certControl_no;
  }

  async exportUserData(userId) {
    const userRes = await pool.query('SELECT name, email, role, barangay, "createdAt", "updatedAt" FROM "user" WHERE id = $1', [userId]);
    
    if (userRes.rows.length === 0) {
      throw new Error("NOT_FOUND");
    }
    
    const logRes = await pool.query('SELECT act_date, act_log, act_type FROM activity_log WHERE user_id = $1', [userId]).catch(() => ({ rows: [] }));
    const certRes = await pool.query('SELECT * FROM certificates WHERE user_id = $1', [userId]).catch(() => ({ rows: [] }));
    const progressRes = await pool.query('SELECT * FROM user_step_progress WHERE user_id = $1', [userId]).catch(() => ({ rows: [] }));
    
    return {
      profile: userRes.rows[0],
      activityLogs: logRes.rows,
      certificates: certRes.rows,
      learningProgress: progressRes.rows,
      exportedAt: new Date().toISOString()
    };
  }

  async getUserSettings(userId) {
    const { rows } = await pool.query('SELECT settings FROM "user" WHERE id = $1', [userId]);
    if (rows.length === 0) throw new Error("NOT_FOUND");
    return rows[0].settings || { announcements: true, reminders: true };
  }

  async updateUserSettings(userId, announcements, reminders) {
    const safeSettings = {
      announcements: announcements === undefined ? true : Boolean(announcements),
      reminders:     reminders     === undefined ? true : Boolean(reminders),
    };
    await pool.query('UPDATE "user" SET settings = $1 WHERE id = $2', [safeSettings, userId]);
    return safeSettings;
  }
}

module.exports = new UserService();
