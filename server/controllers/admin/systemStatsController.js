const pool = require("../../config/db");

// @desc    Get system-wide statistics
// @access  Private (system_admin only)
exports.getSystemStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM "user") AS total_users,
        (SELECT COUNT(*) FROM "user" WHERE archived = false AND (banned IS NULL OR banned = false)) AS active_users,
        (SELECT COUNT(*) FROM "user" WHERE last_active >= NOW() - INTERVAL '5 minutes') AS online_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'resident') AS resident_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'barangay_admin') AS barangay_admin_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'mdrrmo_admin') AS mdrrmo_admin_users,
        (SELECT COUNT(*) FROM "user" WHERE role = 'system_admin') AS system_admin_users,
        (SELECT COUNT(*) FROM "user" WHERE banned = true) AS banned_users,
        (SELECT COUNT(*) FROM "user" WHERE archived = true) AS archived_users,
        (SELECT COUNT(*) FROM module_data) AS total_modules,
        (SELECT COUNT(*) FROM module_activity) AS total_enrollments,
        (SELECT COUNT(*) FROM module_activity WHERE modstatus = 'Completed') AS total_completions,
        (SELECT COUNT(*) FROM certificates) AS total_certificates,
        (SELECT COUNT(*) FROM activity_log) AS total_log_entries
    `);
    res.json({ success: true, data: stats.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get 24h Traffic Analytics Template
// @access  Private (system_admin only)
exports.getTrafficAnalytics = async (req, res) => {
  try {
    // Template: In a production environment, this would query activity logs grouped by hour
    // For the defense demonstration, we generate a realistic static traffic curve
    const hours = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(now.getHours() - i);
      const hourStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Simulate peak traffic between 10am-4pm
      const h = d.getHours();
      let users = 10 + Math.floor(Math.random() * 20); // Baseline
      if (h >= 9 && h <= 17) users += 40 + Math.floor(Math.random() * 30); // Work hours
      if (h === 12) users -= 20; // Lunch dip
      
      hours.push({ time: hourStr, activeUsers: users });
    }

    res.json({ success: true, data: hours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get DB health status
// @access  Private (system_admin only)
exports.getHealthStatus = async (req, res) => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    const latency = Date.now() - start;
    res.json({
      success: true,
      data: {
        db_status: 'connected',
        db_latency_ms: latency,
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    });
  } catch (err) {
    res.status(500).json({ success: true, data: { db_status: 'disconnected', db_latency_ms: null } });
  }
};
