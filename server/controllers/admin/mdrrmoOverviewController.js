const pool = require("../../config/db");

// @desc    Get MDRRMO dashboard metrics
// @access  Private (mdrrmo_admin, system_admin)
exports.getMetrics = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM "user" WHERE role = 'resident' AND archived = false AND (banned IS NULL OR banned = false)) AS registered_responders,
        (SELECT COUNT(*) FROM module_data WHERE moddateremove IS NULL AND status = 'published') AS active_modules,
        (SELECT COUNT(*) FROM module_data WHERE moddateremove IS NULL AND status = 'pending_review') AS pending_reviews,
        (SELECT COUNT(*) FROM certificates WHERE status = 'active') AS certificates_issued,
        (SELECT COUNT(*) FROM module_activity) AS total_enrollments
    `);

    const data = {
      registered_responders: parseInt(stats.rows[0].registered_responders, 10) || 0,
      active_modules: parseInt(stats.rows[0].active_modules, 10) || 0,
      pending_reviews: parseInt(stats.rows[0].pending_reviews, 10) || 0,
      certificates_issued: parseInt(stats.rows[0].certificates_issued, 10) || 0,
      total_enrollments: parseInt(stats.rows[0].total_enrollments, 10) || 0
    };

    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Metrics Error:", err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get module distribution by category
// @access  Private (mdrrmo_admin, system_admin)
exports.getModuleDistribution = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(modcat), ''), 'Uncategorized') as category,
        COUNT(*) as count
      FROM module_data 
      WHERE moddateremove IS NULL AND status = 'published'
      GROUP BY category
      ORDER BY count DESC
    `);
    
    const data = result.rows.map(row => ({
      name: row.category,
      value: parseInt(row.count, 10) || 0
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Module Distribution Error:", err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get 7-day enrollment trend
// @access  Private (mdrrmo_admin, system_admin)
exports.getEnrollmentTrend = async (req, res) => {
  try {
    const query = `
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW() - INTERVAL '6 days'),
          date_trunc('day', NOW()),
          '1 day'::interval
        ) AS day
      )
      SELECT 
        d.day,
        COUNT(ma.modact_id) AS enrollments
      FROM days d
      LEFT JOIN module_activity ma ON date_trunc('day', ma.started_at) = d.day
      GROUP BY d.day
      ORDER BY d.day ASC;
    `;

    const result = await pool.query(query);

    const data = result.rows.map(row => {
      const d = new Date(row.day);
      const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        name: dayStr,
        enrollments: parseInt(row.enrollments, 10) || 0
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Enrollment Trend Error:", err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get recent activity logs
// @access  Private (mdrrmo_admin, system_admin)
exports.getRecentActivity = async (req, res) => {
  try {
    // Just fetch the 5 most recent global activity log entries, tailored for MDRRMO view
    const result = await pool.query(`
      SELECT al.act_id, al.user_id, u.name AS user_name,
             al.act_date, al.act_log
      FROM activity_log al
      LEFT JOIN "user" u ON al.user_id = u.id
      WHERE al.act_log ILIKE '%certificate%'
         OR al.act_log ILIKE '%module%'
         OR al.act_log ILIKE '%register%'
         OR al.act_log ILIKE '%approv%'
         OR al.act_log ILIKE '%reject%'
         OR al.act_log ILIKE '%submit%'
      ORDER BY al.act_date DESC
      LIMIT 10
    `);

    const data = result.rows.map(row => ({
      id: row.act_id,
      user_name: row.user_name || 'System',
      source: row.user_name ? `User: ${row.user_name}` : `User ID: ${row.user_id}`,
      timestamp: row.act_date, // Send ISO date to let frontend parse relatively
      log: row.act_log
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("MDRRMO Recent Activity Error:", err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};


// @desc    Get aggregate data per barangay for Sector Overview
// @access  Private (mdrrmo_admin, head_mdrrmo_admin, system_admin)
exports.getSectorOverview = async (req, res) => {
  try {
    const query = `
        WITH unassigned_stats AS (
          SELECT 
            NULL::integer AS barangay_id,
            'Unassigned' AS barangay_name,
            COUNT(DISTINCT CASE WHEN u.role = 'resident' THEN u.id END) AS resident_count,
            COUNT(DISTINCT CASE WHEN u.role = 'barangay_admin' THEN u.id END) AS active_admins,
            COUNT(DISTINCT c.cert_id) AS certificates_issued,
            COUNT(DISTINCT CASE WHEN u.role = 'resident' AND c.status = 'active' THEN u.id END) AS certified_responders,
            COALESCE(
              (COUNT(DISTINCT CASE WHEN u.role = 'resident' AND ma.modstatus ILIKE 'completed' THEN ma.modact_id END)::float / 
               NULLIF(COUNT(DISTINCT CASE WHEN u.role = 'resident' AND ma.modact_id IS NOT NULL THEN ma.modact_id END), 0)
              ) * 100, 0
            ) AS avg_completion_rate
          FROM "user" u
          LEFT JOIN certificates c ON u.id = c.user_id
          LEFT JOIN module_activity ma ON u.id = ma.user_id
          WHERE u.barangay_id IS NULL AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
        ),
        barangay_stats AS (
          SELECT 
            b.id AS barangay_id,
            b.name AS barangay_name,
            COUNT(DISTINCT CASE WHEN u.role = 'resident' THEN u.id END) AS resident_count,
            COUNT(DISTINCT CASE WHEN u.role = 'barangay_admin' THEN u.id END) AS active_admins,
            COUNT(DISTINCT c.cert_id) AS certificates_issued,
            COUNT(DISTINCT CASE WHEN u.role = 'resident' AND c.status = 'active' THEN u.id END) AS certified_responders,
            COALESCE(
              (COUNT(DISTINCT CASE WHEN u.role = 'resident' AND ma.modstatus ILIKE 'completed' THEN ma.modact_id END)::float / 
               NULLIF(COUNT(DISTINCT CASE WHEN u.role = 'resident' AND ma.modact_id IS NOT NULL THEN ma.modact_id END), 0)
              ) * 100, 0
            ) AS avg_completion_rate
          FROM barangays b
          LEFT JOIN "user" u ON u.barangay_id = b.id AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
          LEFT JOIN certificates c ON u.id = c.user_id
          LEFT JOIN module_activity ma ON u.id = ma.user_id
          GROUP BY b.id, b.name
        )
        SELECT * FROM (
          SELECT * FROM barangay_stats
          UNION ALL
          SELECT * FROM unassigned_stats
        ) combined_results
        ORDER BY 
          CASE WHEN barangay_name = 'Unassigned' THEN 1 ELSE 0 END, 
          barangay_name ASC;
      `;
    const result = await pool.query(query);

    const formattedData = result.rows.map(row => ({
      id: row.barangay_id,
      barangay: row.barangay_name,
      resident_count: parseInt(row.resident_count, 10) || 0,
      active_admins: parseInt(row.active_admins, 10) || 0,
      certificates_issued: parseInt(row.certificates_issued, 10) || 0,
      certified_responders: parseInt(row.certified_responders, 10) || 0,
      avg_completion_rate: Math.round(parseFloat(row.avg_completion_rate) || 0)
    }));

    // Execute trend query comparing current active residents to exactly 30 days ago
    const trendQuery = `
      WITH current_stats AS (
        SELECT 
          COUNT(DISTINCT c.user_id) FILTER (WHERE c.status = 'active') as certified_responders,
          COUNT(DISTINCT u.barangay_id) FILTER (WHERE u.role = 'resident') as covered_barangays,
          (SELECT COUNT(*) FROM (
             SELECT b.id, 
                    COALESCE((COUNT(DISTINCT CASE WHEN ma.modstatus ILIKE 'completed' THEN ma.modact_id END)::float / NULLIF(COUNT(DISTINCT ma.modact_id), 0)) * 100, 0) as rate
             FROM barangays b
             JOIN "user" u ON u.barangay_id = b.id AND u.role = 'resident' AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
             LEFT JOIN module_activity ma ON u.id = ma.user_id
             GROUP BY b.id
          ) sub WHERE rate = 0) as below_threshold
        FROM "user" u
        LEFT JOIN certificates c ON u.id = c.user_id
        WHERE u.role = 'resident' AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
      ),
      past_stats AS (
        SELECT 
          COUNT(DISTINCT c.user_id) FILTER (WHERE c.status = 'active' AND c.completion_date <= NOW() - INTERVAL '30 days') as certified_responders,
          COUNT(DISTINCT u.barangay_id) FILTER (WHERE u.role = 'resident' AND u."createdAt" <= NOW() - INTERVAL '30 days') as covered_barangays,
          (SELECT COUNT(*) FROM (
             SELECT b.id, 
                    COALESCE((COUNT(DISTINCT CASE WHEN ma.modstatus ILIKE 'completed' AND ma.completed_at <= NOW() - INTERVAL '30 days' THEN ma.modact_id END)::float / 
                              NULLIF(COUNT(DISTINCT CASE WHEN ma.started_at <= NOW() - INTERVAL '30 days' THEN ma.modact_id END), 0)) * 100, 0) as rate
             FROM barangays b
             JOIN "user" u ON u.barangay_id = b.id AND u.role = 'resident' AND u.archived = false AND (u.banned IS NULL OR u.banned = false) AND u."createdAt" <= NOW() - INTERVAL '30 days'
             LEFT JOIN module_activity ma ON u.id = ma.user_id
             GROUP BY b.id
          ) sub WHERE rate = 0) as below_threshold
        FROM "user" u
        LEFT JOIN certificates c ON u.id = c.user_id
        WHERE u.role = 'resident' AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
      )
      SELECT 
        c.certified_responders - p.certified_responders AS cert_delta,
        c.covered_barangays - p.covered_barangays AS covered_delta,
        c.below_threshold - p.below_threshold AS threshold_delta
      FROM current_stats c, past_stats p;
    `;
    const trendResult = await pool.query(trendQuery);
    const deltas = trendResult.rows[0];

    const certDelta = parseInt(deltas.cert_delta) || 0;
    const coveredDelta = parseInt(deltas.covered_delta) || 0;
    const thresholdDelta = parseInt(deltas.threshold_delta) || 0;

    const trends = {
      certifiedResponders: {
        delta: certDelta,
        direction: certDelta > 0 ? 'up' : (certDelta < 0 ? 'down' : 'flat'),
        text: certDelta > 0 ? `+${certDelta} this month` : (certDelta < 0 ? `${certDelta} this month` : "Unchanged from last month"),
        color: certDelta > 0 ? 'green' : (certDelta < 0 ? 'red' : 'gray')
      },
      coveredBarangays: {
        delta: coveredDelta,
        direction: coveredDelta > 0 ? 'up' : (coveredDelta < 0 ? 'down' : 'flat'),
        text: coveredDelta > 0 ? `+${coveredDelta} this month` : (coveredDelta < 0 ? `${coveredDelta} this month` : "Unchanged from last month"),
        color: coveredDelta > 0 ? 'green' : (coveredDelta < 0 ? 'red' : 'gray')
      },
      belowThreshold: {
        delta: thresholdDelta,
        direction: thresholdDelta > 0 ? 'up' : (thresholdDelta < 0 ? 'down' : 'flat'),
        text: thresholdDelta > 0 ? `+${thresholdDelta} since last month` : (thresholdDelta < 0 ? `${Math.abs(thresholdDelta)} fewer this month` : "Unchanged from last month"),
        color: thresholdDelta > 0 ? 'red' : (thresholdDelta < 0 ? 'green' : 'gray') // INVERTED COLOR: up = red, down = green
      }
    };

    res.json({ success: true, data: formattedData, trends });
  } catch (error) {
    console.error("Error fetching sector overview data:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get category breakdown for certificates (Sector Overview deep dive)
// @access  Private (mdrrmo_admin, head_mdrrmo_admin, system_admin)
exports.getSectorOverviewCategoryBreakdown = async (req, res) => {
  try {
    const barangayId = req.query.barangay_id;
    
    let query = `
      SELECT 
        COALESCE(NULLIF(TRIM(md.modcat), ''), 'Uncategorized') AS category,
        COUNT(DISTINCT c.cert_id) AS certificate_count
      FROM certificates c
      JOIN "user" u ON c.user_id = u.id
      LEFT JOIN module_data md ON c.module_id = md.mod_id
      WHERE u.role = 'resident' 
        AND c.status = 'active'
        AND u.archived = false AND (u.banned IS NULL OR u.banned = false)
    `;
    const params = [];

    if (barangayId) {
      if (barangayId === 'unassigned') {
        query += ` AND u.barangay_id IS NULL`;
      } else {
        query += ` AND u.barangay_id = $1`;
        params.push(barangayId);
      }
    }

    query += ` GROUP BY category ORDER BY certificate_count DESC`;

    const result = await pool.query(query, params);

    const data = result.rows.map(row => ({
      name: row.category,
      value: parseInt(row.certificate_count, 10) || 0
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching sector category breakdown:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

