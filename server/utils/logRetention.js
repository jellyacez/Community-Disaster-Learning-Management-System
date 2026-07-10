const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const LOGS_DIR = path.join(__dirname, "../logs");
const RETENTION_DAYS = 90;

const startLogRetentionCron = () => {
  // Run every day at 3:00 AM PHT (Local Server Time)
  cron.schedule("0 3 * * *", async () => {
    console.log("[CRON] Starting daily log retention cleanup...");

    try {
      // 1. delete old activity logs
      const dbRes = await pool.query(
        `DELETE FROM activity_log WHERE act_date < NOW() - INTERVAL '${RETENTION_DAYS} days'`
      );
      console.log(`[CRON] Database: Deleted ${dbRes.rowCount} old activity log rows.`);
    } catch (dbErr) {
      console.error("[CRON] Failed to purge database activity logs:", dbErr);
    }

    try {
      // 2. delete old log files
      if (fs.existsSync(LOGS_DIR)) {
        const files = fs.readdirSync(LOGS_DIR);
        const now = Date.now();
        const cutoffTime = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;
        let deletedFiles = 0;

        for (const file of files) {
          if (file.endsWith(".log")) {
            const filePath = path.join(LOGS_DIR, file);
            const stats = fs.statSync(filePath);
            if (stats.mtimeMs < cutoffTime) {
              fs.unlinkSync(filePath);
              deletedFiles++;
            }
          }
        }
        console.log(`[CRON] File System: Deleted ${deletedFiles} old physical log files.`);
      }
    } catch (fsErr) {
      console.error("[CRON] Failed to purge physical log files:", fsErr);
    }

    console.log("[CRON] Log retention cleanup complete.");
  });
};

module.exports = { startLogRetentionCron };
