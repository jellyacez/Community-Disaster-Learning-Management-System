const os = require("os");
const pool = require("../config/db");

// Encapsulated state: an in-memory Map of active alerts.
// Using a Map ensures O(1) lookups and updates, and prevents duplicates.
let activeAlerts = new Map();

/**
 * Manually set an alert (useful for reactive checks like SMTP)
 * @param {string} id - Unique identifier for the alert (e.g. 'SMTP_DOWN')
 * @param {object} payload - Alert details (type, title, message)
 */
function setAlert(id, payload) {
  // If the alert already exists, we just update the timestamp.
  activeAlerts.set(id, { id, timestamp: Date.now(), ...payload });
}

/**
 * Remove an active alert
 * @param {string} id - Unique identifier
 */
function removeAlert(id) {
  activeAlerts.delete(id);
}

/**
 * Get all active alerts, sorted by newest first.
 * @returns {Array} Array of alert objects
 */
function getActiveAlerts() {
  return Array.from(activeAlerts.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Start the background worker to continuously poll OS and DB metrics.
 */
function startAlertMonitor() {
  console.log("Starting Critical Alert Monitor Service...");
  
  // Run every 60 seconds
  setInterval(async () => {
    // 1. Check Memory (Imminent Resource Exhaustion)
    const memUsage = 1 - (os.freemem() / os.totalmem());
    if (memUsage > 0.90) { // 90% threshold
      setAlert("MEM_CRITICAL", {
        type: "danger",
        title: "Critical Memory Warning",
        message: "Server RAM usage exceeded 90%. System out-of-memory (OOM) crash imminent."
      });
    } else {
      removeAlert("MEM_CRITICAL");
    }

    // 2. Check Database Connection (Service Dependency Failure)
    try {
      await pool.query("SELECT 1");
      removeAlert("DB_DISCONNECT");
    } catch (err) {
      setAlert("DB_DISCONNECT", {
        type: "danger",
        title: "Database Disconnect",
        message: "CRITICAL: PostgreSQL connection pool dropped. Application is offline."
      });
    }

    // 3. Brute Force Check (Active Security Threat)
    try {
      const bruteForceRes = await pool.query(`
        SELECT COUNT(*) 
        FROM public.activity_log al
        JOIN public.users u ON al.user_id = u.user_id
        WHERE al.act_log ILIKE '%failed login%' 
          AND u.role IN ('system_admin', 'mdrrmo_admin', 'barangay_admin') 
          AND al.act_date >= NOW() - INTERVAL '3 minutes'
      `);
      if (parseInt(bruteForceRes.rows[0].count, 10) >= 50) {
        setAlert("BRUTE_FORCE", {
          type: "danger",
          title: "Brute-Force Detected",
          message: "Security Alert: 50+ failed login attempts detected on Administrator accounts in the last 3 minutes."
        });
      } else {
        removeAlert("BRUTE_FORCE");
      }
    } catch (err) {
      console.error("Failed to run Brute Force check:", err);
    }

    // 4. Intentional Administrative Overrides
    try {
      const settingsRes = await pool.query(`
        SELECT key, value 
        FROM public.system_settings 
        WHERE key IN ('maintenance_mode', 'emergency_broadcast')
      `);
      let isMaintenance = false;
      let isEmergency = false;
      
      settingsRes.rows.forEach(row => {
        if (row.key === 'maintenance_mode' && row.value === 'true') isMaintenance = true;
        if (row.key === 'emergency_broadcast' && row.value === 'true') isEmergency = true;
      });

      if (isMaintenance) {
        setAlert("MAINTENANCE_MODE", {
          type: "warning",
          title: "Maintenance Mode",
          message: "SYSTEM IS IN MAINTENANCE MODE. All non-admin traffic is currently blocked with a 503 error."
        });
      } else {
        removeAlert("MAINTENANCE_MODE");
      }

      if (isEmergency) {
        setAlert("EMERGENCY_BROADCAST", {
          type: "danger",
          title: "Active Emergency Broadcast",
          message: "GLOBAL EMERGENCY BROADCAST ACTIVE. Currently overriding all standard user dashboards."
        });
      } else {
        removeAlert("EMERGENCY_BROADCAST");
      }
    } catch (err) {
      // Don't log spam if DB is disconnected, DB_DISCONNECT will catch it
    }
  }, 60000);
}

module.exports = {
  setAlert,
  removeAlert,
  getActiveAlerts,
  startAlertMonitor
};
