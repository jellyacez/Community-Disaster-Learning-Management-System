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
    res.status(500).json({ success: false, error: 'Server Error' });
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
    res.status(500).json({ success: false, error: 'Server Error' });
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
    res.status(500).json({ success: false, error: 'Server Error' });
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
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};


// @desc    Get aggregate data per barangay for Sector Overview
// @access  Private (mdrrmo_admin, head_mdrrmo_admin, system_admin)
exports.getSectorOverview = async (req, res) => {
  try {
    const query = `
      SELECT 
        COALESCE(b.name, 'Unassigned') AS barangay_name,
        COUNT(DISTINCT CASE WHEN u.role = 'resident' THEN u.id END) AS resident_count,
        COUNT(DISTINCT CASE WHEN u.role = 'barangay_admin' THEN u.id END) AS active_admins,
        COUNT(DISTINCT c.cert_id) AS certificates_issued,
        -- Approximate completion rate: completed steps / total expected steps across enrolled modules
        COALESCE(
          (SUM(CASE WHEN u.role = 'resident' AND ma.modstatus = 'completed' THEN 1 ELSE 0 END)::float / 
           NULLIF(COUNT(DISTINCT CASE WHEN u.role = 'resident' AND ma.modact_id IS NOT NULL THEN ma.modact_id END), 0)
          ) * 100, 0
        ) AS avg_completion_rate
      FROM "user" u
      LEFT JOIN barangays b ON u.barangay_id = b.id
      LEFT JOIN certificates c ON u.id = c.user_id
      LEFT JOIN module_activity ma ON u.id = ma.user_id
      WHERE u.archived = false AND (u.banned IS NULL OR u.banned = false)
      GROUP BY b.id, b.name
      ORDER BY 
        CASE WHEN b.name IS NULL THEN 1 ELSE 0 END, 
        b.name ASC;
    `;
    const result = await pool.query(query);

    const formattedData = result.rows.map(row => ({
      barangay: row.barangay_name,
      resident_count: parseInt(row.resident_count, 10) || 0,
      active_admins: parseInt(row.active_admins, 10) || 0,
      certificates_issued: parseInt(row.certificates_issued, 10) || 0,
      avg_completion_rate: Math.round(parseFloat(row.avg_completion_rate) || 0)
    }));

    res.json({ success: true, data: formattedData });
  } catch (error) {
    console.error("Error fetching sector overview data:", error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
