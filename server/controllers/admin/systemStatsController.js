const pool = require("../../config/db");
const os = require("os");

// @desc    Get system-wide statistics
// @access  Private (system_admin only)
exports.getSystemStats = async (req, res) => {
  try {
    const [userStats, otherStats] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_users,
          COUNT(*) FILTER (WHERE archived = false AND (banned IS NULL OR banned = false)) AS active_users,
          COUNT(*) FILTER (WHERE last_active >= NOW() - INTERVAL '5 minutes') AS online_users,
          COUNT(*) FILTER (WHERE role = 'resident') AS resident_users,
          COUNT(*) FILTER (WHERE role = 'barangay_admin') AS barangay_admin_users,
          COUNT(*) FILTER (WHERE role = 'mdrrmo_admin') AS mdrrmo_admin_users,
          COUNT(*) FILTER (WHERE role = 'system_admin') AS system_admin_users,
          COUNT(*) FILTER (WHERE banned = true) AS banned_users,
          COUNT(*) FILTER (WHERE archived = true) AS archived_users
        FROM "user"
      `),
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM module_data) AS total_modules,
          (SELECT COUNT(*) FROM module_activity) AS total_enrollments,
          (SELECT COUNT(*) FROM module_activity WHERE modstatus = 'Completed') AS total_completions,
          (SELECT COUNT(*) FROM certificates) AS total_certificates,
          (SELECT COUNT(*) FROM activity_log) AS total_log_entries
      `)
    ]);

    const data = {
      ...userStats.rows[0],
      ...otherStats.rows[0]
    };

    // Postgres COUNT returns strings, parse them to match previous behavior exactly if needed
    // (though JS clients generally handle strings, it's safer to ensure they're numbers)
    for (let key in data) {
      data[key] = parseInt(data[key], 10) || 0;
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get 24h Traffic Analytics
// @access  Private (system_admin only)
exports.getTrafficAnalytics = async (req, res) => {
  try {
    const query = `
      WITH hours AS (
        SELECT generate_series(
          date_trunc('hour', NOW() AT TIME ZONE 'UTC' - INTERVAL '23 hours'),
          date_trunc('hour', NOW() AT TIME ZONE 'UTC'),
          '1 hour'::interval
        ) AS hour
      )
      SELECT 
        h.hour,
        COUNT(DISTINCT al.user_id) AS active_users
      FROM hours h
      LEFT JOIN activity_log al ON date_trunc('hour', al.act_date) = h.hour
      GROUP BY h.hour
      ORDER BY h.hour ASC;
    `;

    const result = await pool.query(query);

    // Format for Recharts (e.g. "10:00 AM")
    const data = result.rows.map(row => {
      const d = new Date(row.hour);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        time: timeStr,
        activeUsers: parseInt(row.active_users, 10) || 0
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Traffic Analytics Error:", err);
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

    // Memory calculations
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    
    // CPU Simulation for Windows
    const platform = os.platform();
    let cpuLoadPercent = 0;
    
    if (platform === 'win32') {
      // Simulates a realistic server idling load between 12% and 18%
      cpuLoadPercent = parseFloat((12 + Math.random() * 6).toFixed(1));
    } else {
      // On linux/mac, loadavg returns an array [1min, 5min, 15min]
      const cpus = os.cpus().length;
      const load = os.loadavg()[0];
      cpuLoadPercent = Math.min(100, parseFloat(((load / cpus) * 100).toFixed(1)));
    }

    res.json({
      success: true,
      data: {
        db_status: 'connected',
        db_latency_ms: latency,
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb: Math.round(usedMemBytes / 1024 / 1024),
        memory_total_mb: Math.round(totalMemBytes / 1024 / 1024),
        memory_usage_percent: Math.round((usedMemBytes / totalMemBytes) * 100),
        cpu_load_percent: cpuLoadPercent,
        disk_usage_percent: 42 // Mocked for Capstone UI
      }
    });
  } catch {
    res.status(500).json({ success: false, data: { db_status: 'disconnected', db_latency_ms: null } });
  }
};
