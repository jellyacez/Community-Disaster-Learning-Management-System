const pool = require("../../config/db");

// 1. GET /api/admin/barangay/analytics
exports.getBarangayAnalytics = async (req, res) => {
  try {
    const barangayId = req.user?.barangay_id;

    if (!barangayId) {
      return res.status(400).json({ 
        error: "SECURITY_FAULT: No barangay associated with this administrator account." 
      });
    }

    // 1. Fetch official Barangay Name from the database
    const barangayInfoResult = await pool.query(
      `SELECT id, name FROM barangays WHERE id = $1`,
      [barangayId]
    );
    const barangayName = barangayInfoResult.rows[0]?.name || `Barangay Sector #${barangayId}`;

    // 2. Top-level KPI metrics strictly scoped to this barangay
    const kpiQuery = `
      SELECT 
        (SELECT COUNT(*) FROM "user" WHERE barangay_id = $1 AND role = 'resident') AS total_residents,
        (SELECT COUNT(DISTINCT c.user_id) 
         FROM certificates c 
         JOIN "user" u ON c.user_id = u.id 
         WHERE u.barangay_id = $1 AND c.status = 'active') AS certified_residents,
        (SELECT COUNT(DISTINCT ma.user_id) 
         FROM module_activity ma 
         JOIN "user" u ON ma.user_id = u.id 
         WHERE u.barangay_id = $1 AND ma.started_at >= NOW() - INTERVAL '30 days') AS active_learners,
        (SELECT COUNT(*) FROM announcements WHERE barangay_id = $1) AS local_alerts
    `;

    // 3. Module Performance breakdown scoped to this barangay
    const moduleStatsQuery = `
      SELECT 
        md.mod_id AS module_id,
        md.modname AS module_title,
        COUNT(CASE WHEN b_ma.modstatus = 'completed' THEN 1 END) AS completed_count,
        COUNT(CASE WHEN b_ma.modstatus = 'in_progress' THEN 1 END) AS in_progress_count,
        COUNT(b_ma.modact_id) AS total_enrolled
      FROM module_data md
      LEFT JOIN (
        SELECT ma.mod_id, ma.modstatus, ma.modact_id
        FROM module_activity ma
        JOIN "user" u ON ma.user_id = u.id
        WHERE u.barangay_id = $1
      ) b_ma ON md.mod_id = b_ma.mod_id
      WHERE md.status = 'published'
      GROUP BY md.mod_id, md.modname
      ORDER BY md.mod_id ASC
    `;

    const [kpiResult, moduleStatsResult] = await Promise.all([
      pool.query(kpiQuery, [barangayId]),
      pool.query(moduleStatsQuery, [barangayId]),
    ]);

    return res.json({
      success: true,
      data: {
        barangay: {
          id: barangayId,
          name: barangayName,
        },
        kpis: {
          total_residents: parseInt(kpiResult.rows[0]?.total_residents, 10) || 0,
          certified_residents: parseInt(kpiResult.rows[0]?.certified_residents, 10) || 0,
          active_learners: parseInt(kpiResult.rows[0]?.active_learners, 10) || 0,
          local_alerts: parseInt(kpiResult.rows[0]?.local_alerts, 10) || 0,
        },
        modulePerformance: moduleStatsResult.rows.map(row => ({
          module_id: row.module_id,
          module_title: row.module_title,
          completed_count: parseInt(row.completed_count, 10) || 0,
          in_progress_count: parseInt(row.in_progress_count, 10) || 0,
          total_enrolled: parseInt(row.total_enrolled, 10) || 0,
        })),
      },
    });
  } catch (error) {
    console.error("DETAILED_BARANGAY_ANALYTICS_ERROR:", error);
    return res.status(500).json({ 
      error: "Failed to load barangay analytics.", 
      detail: error.message 
    });
  }
};

// 2. GET /api/admin/barangay/announcements
exports.getBarangayAnnouncements = async (req, res) => {
  try {
    const barangayId = req.user?.barangay_id;

    if (!barangayId) {
      return res.status(400).json({ error: "No barangay assigned to this administrator account." });
    }

    const result = await pool.query(
      `SELECT 
        a.id, 
        a.title, 
        a.content, 
        a.date AS created_at, 
        u.name AS author_name 
       FROM announcements a
       LEFT JOIN "user" u ON a.author_id = u.id
       WHERE a.barangay_id = $1
       ORDER BY a.date DESC`,
      [barangayId]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching barangay announcements:", error);
    res.status(500).json({ error: "Failed to fetch announcements." });
  }
};

// 3. POST /api/admin/barangay/announcements
exports.createBarangayAnnouncement = async (req, res) => {
  try {
    const { title, content } = req.body;
    const barangayId = req.user?.barangay_id;
    const authorId = req.user?.id || req.user?.user_id;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required." });
    }

    if (!barangayId || !authorId) {
      return res.status(400).json({ error: "Unauthorized: Missing administrative credentials." });
    }

    const result = await pool.query(
      `INSERT INTO announcements (title, content, author_id, barangay_id, date)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, title, content, date AS created_at`,
      [title, content, authorId, barangayId]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error("Error posting barangay announcement:", error);
    res.status(500).json({ error: "Failed to create announcement." });
  }
};

// 4. GET /api/admin/barangay/activity-log
exports.getBarangayActivityLog = async (req, res) => {
  try {
    const barangayId = req.user?.barangay_id;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);

    if (!barangayId) {
      return res.status(400).json({ error: "No barangay assigned to this administrator account." });
    }

    const result = await pool.query(
      `SELECT 
        al.act_id AS id, 
        al.act_log AS details, 
        al.act_date AS created_at, 
        u.name AS user_name, 
        u.email AS user_email
       FROM activity_log al
       JOIN "user" u ON al.user_id = u.id
       WHERE u.barangay_id = $1
       ORDER BY al.act_date DESC
       LIMIT $2`,
      [barangayId, limit]
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching barangay activity logs:", error);
    res.status(500).json({ error: "Failed to fetch activity logs." });
  }
};