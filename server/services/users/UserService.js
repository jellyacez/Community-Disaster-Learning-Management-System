const pool = require("../../config/db");

class UserService {
  async getProviders(userId) {
    const result = await pool.query('SELECT "providerId" FROM account WHERE "userId" = $1', [userId]);
    return result.rows.map(r => r.providerId);
  }

  async onboarding(userId, name, barangay) {
    if (!name || !barangay) throw new Error("MISSING_DATA");

    const bRes = await pool.query('SELECT id FROM barangays WHERE name = $1', [barangay]);
    const barangayId = bRes.rows.length > 0 ? bRes.rows[0].id : null;
    await pool.query(`UPDATE "user" SET name = $1, barangay_id = $2 WHERE id = $3`, [
      name,
      barangayId,
      userId,
    ]);
  }

  async getAllUsers(page = 1, limit = 10, search = "", roleFilter = "", status = "", barangayFilter = "", adminContext = null) {
    if (!adminContext || !adminContext.role) {
      throw new Error("SECURITY_FAULT: Missing or invalid adminContext. Cannot safely return users.");
    }
    const allowedUnscopedRoles = ["system_admin", "mdrrmo_admin"];

    limit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    // Structural enforcement of barangay scoping
    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      conditions.push(`barangay_id = $${idx}`);
      values.push(adminContext.barangay_id);
      idx++;
    } else if (allowedUnscopedRoles.includes(adminContext.role)) {
      if (barangayFilter) {
        conditions.push(`barangay_id = (SELECT id FROM barangays WHERE name = $${idx})`);
        values.push(barangayFilter);
        idx++;
      }
    } else {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to access user records.`);
    }

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (roleFilter) {
      conditions.push(`role = $${idx}`);
      values.push(roleFilter);
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
      `SELECT u.id, u.name, u.email, u."emailVerified", u.image, u.role, u."banned", u."banReason", u."banExpires", u."createdAt", u."updatedAt", u."twoFactorEnabled", b.name AS barangay, u.archived
         FROM "user" u 
         LEFT JOIN barangays b ON u.barangay_id = b.id ${where.replace(/barangay_id/g, 'u.barangay_id')}
         ORDER BY u."createdAt" DESC LIMIT $${idx} OFFSET $${idx + 1}`,
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
      const userRes = await client.query('SELECT u.name, u.role, b.name AS barangay FROM "user" u LEFT JOIN barangays b ON u.barangay_id = b.id WHERE u.id = $1', [userId]);
      if (userRes.rows.length === 0) {
        throw new Error("NOT_FOUND");
      }
      const { role, barangay } = userRes.rows[0];
      
      // 2. anonymize certificates
      await client.query(`
        UPDATE certificates 
        SET user_id = NULL, 
            anonymized_name = 'Archived Resident', 
            barangay = $1
        WHERE user_id = $2
      `, [barangay, userId]);
      
      // 3. Handle activity_log retention for governance audits
      if (['barangay_admin', 'mdrrmo_admin', 'head_mdrrmo_admin', 'system_admin'].includes(role)) {
        await client.query(`
          UPDATE activity_log 
          SET user_id = NULL, 
              act_log = act_log || ' (Performed by Deleted Admin)' 
          WHERE user_id = $1
        `, [userId]).catch(() => {});
      } else {
        await client.query('DELETE FROM activity_log WHERE user_id = $1', [userId]).catch(() => {});
      }
      
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

  async getCertificateData(userId, token) {
    const query = `
      SELECT c.cert_rec, c.verification_token, c.completion_date, c.expires_at, m.modname as module_title, m.description as module_description
      FROM certificates c
      JOIN module_data m ON c.module_id = m.mod_id
      WHERE c.user_id = $1 AND c.verification_token = $2 AND c.status != 'revoked'
    `;
    const { rows } = await pool.query(query, [userId, token]);
    
    if (rows.length === 0) {
      throw new Error("NOT_FOUND");
    }
    
    return rows[0];
  }

  async exportUserData(userId) {
    const userRes = await pool.query('SELECT u.name, u.email, u.role, b.name AS barangay, u."createdAt", u."updatedAt" FROM "user" u LEFT JOIN barangays b ON u.barangay_id = b.id WHERE u.id = $1', [userId]);
    
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

  async updateUserSettings(userId, newSettings) {
    // Merge new settings with existing settings
    const { rows } = await pool.query('SELECT settings FROM "user" WHERE id = $1', [userId]);
    const currentSettings = (rows.length > 0 && rows[0].settings) ? rows[0].settings : { announcements: true, reminders: true };
    
    const safeSettings = {
      ...currentSettings,
      ...newSettings
    };
    
    await pool.query('UPDATE "user" SET settings = $1 WHERE id = $2', [safeSettings, userId]);
    return safeSettings;
  }
}

module.exports = new UserService();
