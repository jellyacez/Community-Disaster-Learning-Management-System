const pool = require("../../config/db");

// @desc    Get paginated activity log
// @access  Private (system_admin only)
exports.getActivityLog = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const search = req.query.search || '';
    const role = req.query.role || '';
    const action = req.query.action || '';

    const conditions = [];
    const params = [limit, offset];
    let paramIndex = 3;

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR al.act_log ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (action) {
      // Use ILIKE to match common actions since we don't have an action_type column
      conditions.push(`al.act_log ILIKE $${paramIndex}`);
      params.push(`%${action}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) FROM activity_log al
      LEFT JOIN "user" u ON al.user_id = u.id
      ${whereClause}
    `;
    
    // We only pass the filtering params to the count query, ignoring limit and offset (indices 0 and 1)
    const countParams = params.slice(2);

    const countResult = await pool.query(countQuery, countParams);
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

// @desc    Export activity log to CSV
// @access  Private (system_admin only)
exports.exportActivityLog = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.act_id, al.user_id, u.name AS user_name, u.role AS user_role,
              al.act_date, al.act_log
       FROM activity_log al
       LEFT JOIN "user" u ON al.user_id = u.id
       ORDER BY al.act_date DESC`
    );

    const headers = ['ID', 'User ID', 'User Name', 'Role', 'Date', 'Action'];
    const rows = result.rows.map(r => {
      const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const s = String(str);
        if (s.includes(',') || s.includes('"') || s.includes('\\n')) {
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
        escapeCsv(r.act_log)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="system_activity_logs.csv"');
    return res.send(csvContent);
  } catch (err) {
    console.error("Export logs error:", err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
