const os = require("os");
const pool = require("../config/db");

// keyed by alert id, so raising the same alert again updates it instead of duplicating
let activeAlerts = new Map();

/** For reactive checks such as SMTP_DOWN. Setting an existing id refreshes its timestamp. */
function setAlert(id, payload) {
  activeAlerts.set(id, { id, timestamp: Date.now(), ...payload });
}

function removeAlert(id) {
  activeAlerts.delete(id);
}

/** Newest first. */
function getActiveAlerts() {
  return Array.from(activeAlerts.values()).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

function startAlertMonitor() {
  console.log("Starting Critical Alert Monitor Service...");

  setInterval(async () => {
    const memUsage = 1 - os.freemem() / os.totalmem();
    if (memUsage > 0.9) {
      setAlert("MEM_CRITICAL", {
        type: "danger",
        title: "Critical Memory Warning",
        message:
          "Server RAM usage exceeded 90%. System out-of-memory (OOM) crash imminent.",
      });
    } else {
      removeAlert("MEM_CRITICAL");
    }

    try {
      await pool.query("SELECT 1");
      removeAlert("DB_DISCONNECT");
    } catch {
      setAlert("DB_DISCONNECT", {
        type: "danger",
        title: "Database Disconnect",
        message:
          "CRITICAL: PostgreSQL connection pool dropped. Application is offline.",
      });
    }

    try {
      const bruteForceRes = await pool.query(`
        SELECT COUNT(*) 
        FROM public.activity_log al
        JOIN public."user" u ON al.user_id = u.id
        WHERE al.act_log ILIKE '%failed login%' 
          AND u.role IN ('system_admin', 'mdrrmo_admin', 'barangay_admin') 
          AND al.act_date >= NOW() - INTERVAL '3 minutes'
      `);
      if (parseInt(bruteForceRes.rows[0].count, 10) >= 50) {
        setAlert("BRUTE_FORCE", {
          type: "danger",
          title: "Brute-Force Detected",
          message:
            "Security Alert: 50+ failed login attempts detected on Administrator accounts in the last 3 minutes.",
        });
      } else {
        removeAlert("BRUTE_FORCE");
      }
    } catch (err) {
      console.error("Failed to run Brute Force check:", err);
      setAlert("MONITOR_ERROR", {
        type: "danger",
        title: "Security Monitor Offline",
        message:
          "The brute-force detection service encountered a database error and is not actively monitoring.",
      });
    }

    // admin overrides: maintenance mode and emergency broadcasts
    try {
      const settingsRes = await pool.query(`
        SELECT key, value 
        FROM public.system_settings 
        WHERE key IN ('maintenance_mode', 'broadcast_active', 'broadcast_severity')
      `);
      let isMaintenance = false;
      let isBroadcastActive = false;
      let isCritical = false;

      settingsRes.rows.forEach((row) => {
        if (row.key === "maintenance_mode" && row.value === "true")
          isMaintenance = true;
        if (row.key === "broadcast_active" && row.value === "true")
          isBroadcastActive = true;
        if (row.key === "broadcast_severity" && row.value === "critical")
          isCritical = true;
      });
      // Only a critical-severity broadcast counts as an emergency override
      const isEmergency = isBroadcastActive && isCritical;

      if (isMaintenance) {
        setAlert("MAINTENANCE_MODE", {
          type: "warning",
          title: "Maintenance Mode",
          message:
            "SYSTEM IS IN MAINTENANCE MODE. All non-admin traffic is currently blocked with a 503 error.",
        });
      } else {
        removeAlert("MAINTENANCE_MODE");
      }

      if (isEmergency) {
        setAlert("EMERGENCY_BROADCAST", {
          type: "danger",
          title: "Active Emergency Broadcast",
          message:
            "GLOBAL EMERGENCY BROADCAST ACTIVE. Currently overriding all standard user dashboards.",
        });
      } else {
        removeAlert("EMERGENCY_BROADCAST");
      }
    } catch {
      // DB_DISCONNECT already covers a dead DB; don't spam the log
    }
  }, 60000);
}

module.exports = {
  setAlert,
  removeAlert,
  getActiveAlerts,
  startAlertMonitor,
};
