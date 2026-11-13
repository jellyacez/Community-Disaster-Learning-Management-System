const cron = require("node-cron");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const logger = require("./logger");

const LOGS_DIR = path.join(__dirname, "../logs");
const RETENTION_DAYS = 90;

/** Deletes activity_log rows and server/logs files older than RETENTION_DAYS. */
async function runLogRetentionCleanup() {
  logger.logInfo("log_retention_cron_start", {
    message: `Starting daily log retention cleanup (retention window: ${RETENTION_DAYS} days).`
  });

  let dbRowsDeleted = 0;
  let filesDeleted = 0;

  try {
    const dbRes = await pool.query(
      `DELETE FROM activity_log WHERE act_date < NOW() - INTERVAL '1 day' * $1`,
      [RETENTION_DAYS]
    );
    dbRowsDeleted = dbRes.rowCount || 0;
  } catch (dbErr) {
    logger.logError("log_retention_cron_db_error", {
      message: "Failed to purge database activity logs.",
      error: dbErr.message,
      stack: dbErr.stack
    });
  }

  try {
    if (fs.existsSync(LOGS_DIR)) {
      const files = fs.readdirSync(LOGS_DIR);
      const cutoffTime = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith(".log")) {
          const filePath = path.join(LOGS_DIR, file);
          let isExpired = false;

          // Check filename date first (e.g. error-YYYY-MM-DD.log or info-YYYY-MM-DD.log)
          const dateMatch = file.match(/^(?:info|error)-(\d{4}-\d{2}-\d{2})\.log$/);
          if (dateMatch) {
            const fileTimestamp = new Date(dateMatch[1]).getTime();
            if (!isNaN(fileTimestamp) && fileTimestamp < cutoffTime) {
              isExpired = true;
            }
          }

          // fall back to mtime when the filename has no date
          if (!isExpired) {
            const stats = fs.statSync(filePath);
            if (stats.mtimeMs < cutoffTime) {
              isExpired = true;
            }
          }

          if (isExpired) {
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

  return { dbRowsDeleted, filesDeleted, success: true };
}

const startLogRetentionCron = () => {
  // Run every day at 3:00 AM PHT
  cron.schedule("0 3 * * *", async () => {
    await runLogRetentionCleanup();
  }, {
    scheduled: true,
    timezone: "Asia/Manila"
  });

  logger.logInfo("log_retention_cron_scheduled", {
    message: "Log retention cron scheduled (runs daily at 3:00 AM PHT)."
  });
};

module.exports = { startLogRetentionCron, runLogRetentionCleanup };
