const pool = require("../../config/db");
const logger = require("../../utils/logger");

class ActivityLogService {
  async getActivityLog(queryParams) {
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = Math.min(parseInt(queryParams.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const search = queryParams.search || "";
    const role = queryParams.role || "";
    const action = queryParams.action || "";

    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      if (role === "non_resident") {
        conditions.push(`u.role != 'resident'`);
      } else {
        conditions.push(`u.role = $${paramIndex}`);
        params.push(role);
        paramIndex++;
      }
    }

    if (action) {
      if (action === "auth") {
        conditions.push(`(al.act_log ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex + 1})`);
        params.push("%log%", "%password%");
        paramIndex += 2;
      } else if (action === "provision") {
        conditions.push(`al.act_log ILIKE $${paramIndex}`);
        params.push("%provision%");
        paramIndex++;
      } else if (action === "role") {
        conditions.push(`(al.act_log ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex + 1})`);
        params.push("%role%", "%update%");
        paramIndex += 2;
      } else if (action === "ban") {
        conditions.push(`(al.act_log ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex + 1} OR al.act_log ILIKE $${paramIndex + 2} OR al.act_log ILIKE $${paramIndex + 3})`);
        params.push("%ban%", "%unban%", "%archiv%", "%restor%");
        paramIndex += 4;
      } else if (action === "settings") {
        conditions.push(`(al.act_log ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex + 1} OR al.act_log ILIKE $${paramIndex + 2} OR al.act_log ILIKE $${paramIndex + 3})`);
        params.push("%branding%", "%maintenance%", "%broadcast%", "%organization%");
        paramIndex += 4;
      } else if (action === "security") {
        conditions.push(`(al.act_log ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex + 1} OR al.act_log ILIKE $${paramIndex + 2})`);
        params.push("%IP address%", "%force logout%", "%backup%");
        paramIndex += 3;
      } else {
        conditions.push(`al.act_log ILIKE $${paramIndex}`);
        params.push(`%${action}%`);
        paramIndex++;
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) FROM activity_log al
      LEFT JOIN "user" u ON al.user_id = u.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT al.act_id, al.user_id, u.name AS user_name, u.role AS user_role,
              al.act_date, al.act_log
       FROM activity_log al
       LEFT JOIN "user" u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.act_date DESC, al.act_id DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
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

  async exportActivityLog(adminUserId) {
    const result = await pool.query(
      `SELECT al.act_id, al.user_id, u.name AS user_name, u.role AS user_role,
              al.act_date, al.act_log
       FROM activity_log al
       LEFT JOIN "user" u ON al.user_id = u.id
       ORDER BY al.act_date DESC`
    );

    const headers = ["ID", "User ID", "User Name", "Role", "Date", "Action"];
    const rows = result.rows.map((r) => {
      const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const s = String(str);
        if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      return [
        r.act_id,
        r.user_id,
        escapeCsv(r.user_name),
        escapeCsv(r.user_role),
        new Date(r.act_date).toISOString(),
        escapeCsv(r.act_log),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    if (adminUserId) {
      logger.logActivity(adminUserId, "Exported system audit logs");
    }

    return csvContent;
  }

  async getMdrrmoActivityLog(queryParams) {
    const page = parseInt(queryParams.page, 10) || 1;
    const limit = Math.min(parseInt(queryParams.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const search = queryParams.search || "";
    const role = queryParams.role || "";
    const action = queryParams.action || "";

    const conditions = ["(u.role != 'system_admin' OR u.role IS NULL)"];
    const params = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      if (role === "non_resident") {
        conditions.push(`u.role != 'resident'`);
      } else {
        conditions.push(`u.role = $${paramIndex}`);
        params.push(role);
        paramIndex++;
      }
    }

    if (action) {
      if (action === "auth") {
        conditions.push(`(al.act_log ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex + 1})`);
        params.push("%log%", "%password%");
        paramIndex += 2;
      } else if (action === "module") {
        conditions.push(`al.act_log ILIKE $${paramIndex}`);
        params.push("%module%");
        paramIndex++;
      } else if (action === "certificate") {
        conditions.push(`al.act_log ILIKE $${paramIndex}`);
        params.push("%certificate%");
        paramIndex++;
      } else if (action === "review") {
        conditions.push(`(al.act_log ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex + 1} OR al.act_log ILIKE $${paramIndex + 2})`);
        params.push("%approv%", "%reject%", "%submit%");
        paramIndex += 3;
      } else {
        conditions.push(`al.act_log ILIKE $${paramIndex}`);
        params.push(`%${action}%`);
        paramIndex++;
      }
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const countQuery = `
      SELECT COUNT(*) FROM activity_log al
      LEFT JOIN "user" u ON al.user_id = u.id
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT al.act_id, al.user_id, u.name AS user_name, u.role AS user_role,
              al.act_date, al.act_log
       FROM activity_log al
       LEFT JOIN "user" u ON al.user_id = u.id
       ${whereClause}
       ORDER BY al.act_date DESC, al.act_id DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
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

  async exportMdrrmoActivityLog(adminUserId) {
    const result = await pool.query(
      `SELECT al.act_id, al.user_id, u.name AS user_name, u.role AS user_role,
              al.act_date, al.act_log
       FROM activity_log al
       LEFT JOIN "user" u ON al.user_id = u.id
       WHERE (u.role != 'system_admin' OR u.role IS NULL)
       ORDER BY al.act_date DESC`
    );

    const headers = ["ID", "User ID", "User Name", "Role", "Date", "Action"];
    const rows = result.rows.map((r) => {
      const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const s = String(str);
        if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      return [
        r.act_id,
        r.user_id,
        escapeCsv(r.user_name),
        escapeCsv(r.user_role),
        new Date(r.act_date).toISOString(),
        escapeCsv(r.act_log),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    if (adminUserId) {
      logger.logActivity(adminUserId, "Exported MDRRMO audit logs");
    }

    return csvContent;
  }
}

module.exports = new ActivityLogService();
