const pool = require("../../config/db");

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

    let countQuery;
    let countParams;

    if (search) {
      countQuery = `
        SELECT COUNT(*) FROM activity_log al
        LEFT JOIN "user" u ON al.user_id = u.id
        WHERE u.name ILIKE $1 OR al.act_log ILIKE $1
      `;
      countParams = [`%${search}%`];
    } else {
      countQuery = `SELECT COUNT(*) FROM activity_log`;
      countParams = [];
    }

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
