const cron = require("node-cron");
const pool = require("../config/db");
const logger = require("./logger");

/**
 * certificateExpiryCron
 * 
 * Periodically updates certificates whose expires_at timestamp has passed,
 * changing their status from 'active' to 'expired'.
 * 
 * NOTE: This cron job acts purely as a consistency backstop for the write-side. 
 * The read-side endpoints (verify, admin list) already compute expiry live at query time.
 */
function startCertificateExpiryCron() {
  // Run once every day at 1:00 AM
  cron.schedule("0 1 * * *", async () => {
    // Always emit a heartbeat so we can confirm the cron is running in production logs,
    // even on days when no certificates have expired.
    logger.logInfo("certificate_expiry_cron_start", {
      message: "Certificate expiry cron starting."
    });

    try {
      const result = await pool.query(`
        UPDATE certificates 
        SET status = 'expired'
        WHERE expires_at < NOW() AND status = 'active'
      `);

      logger.logInfo("certificate_expiry_cron_complete", {
        message: `Certificate expiry cron finished. Certificates marked expired: ${result.rowCount}.`,
        expired_count: result.rowCount
      });
    } catch (err) {
      logger.logError("certificate_expiry_cron_error", {
        message: "Failed to run certificate expiry cron job.",
        error: err.message,
        stack: err.stack
      });
    }
  });

  logger.logInfo("certificate_expiry_cron_scheduled", {
    message: "Certificate expiry cron scheduled (runs daily at 1:00 AM)."
  });
}

module.exports = { startCertificateExpiryCron };
