const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const logger = require("./logger");

const LOGS_DIR = path.join(__dirname, "../logs");
const RETENTION_DAYS = 90;

const startLogRetentionCron = () => {
  // Run every day at 3:00 AM PHT (Local Server Time)
  cron.schedule("0 3 * * *", async () => {
    logger.logInfo("log_retention_cron_start", {
      message: `Starting daily log retention cleanup (retention window: ${RETENTION_DAYS} days).`
    });

    let dbRowsDeleted = 0;
    let filesDeleted = 0;

    try {
      // 1. Delete old activity log rows from the database
      const dbRes = await pool.query(
        `DELETE FROM activity_log WHERE act_date < NOW() - INTERVAL '1 day' * $1`,
        [RETENTION_DAYS]
      );
      dbRowsDeleted = dbRes.rowCount;
    } catch (dbErr) {
      logger.logError("log_retention_cron_db_error", {
        message: "Failed to purge database activity logs.",
        error: dbErr.message,
        stack: dbErr.stack
      });
    }

    try {
      // 2. Delete old physical log files from server/logs/
      if (fs.existsSync(LOGS_DIR)) {
        const files = fs.readdirSync(LOGS_DIR);
        const cutoffTime = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

        for (const file of files) {
          if (file.endsWith(".log")) {
            const filePath = path.join(LOGS_DIR, file);
            const stats = fs.statSync(filePath);
            if (stats.mtimeMs < cutoffTime) {
              fs.unlinkSync(filePath);
              filesDeleted++;
            }
          }
        }
      }
    } catch (fsErr) {
      logger.logError("log_retention_cron_fs_error", {
        message: "Failed to purge physical log files.",
        error: fsErr.message,
        stack: fsErr.stack
      });
    }

    // Always emit a completion heartbeat regardless of whether anything was deleted
    logger.logInfo("log_retention_cron_complete", {
      message: "Daily log retention cleanup finished.",
      db_rows_deleted: dbRowsDeleted,
      log_files_deleted: filesDeleted
    });
  });

  logger.logInfo("log_retention_cron_scheduled", {
    message: "Log retention cron scheduled (runs daily at 3:00 AM)."
  });
};

module.exports = { startLogRetentionCron };
