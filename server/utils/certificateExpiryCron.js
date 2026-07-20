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
    try {
      const result = await pool.query(`
        UPDATE certificates 
        SET status = 'expired'
        WHERE expires_at < NOW() AND status = 'active'
      `);

      if (result.rowCount > 0) {
        logger.logInfo('certificate_expiry_cron_success', {
          message: `Successfully expired ${result.rowCount} certificates.`
        });
      }
    } catch (err) {
      logger.logError('certificate_expiry_cron_error', {
        message: "Failed to run certificate expiry cron job.",
        error: err.message,
        stack: err.stack
      });
    }
  });

  console.log("Certificate expiry cron job scheduled (Runs daily at 1:00 AM).");
}

module.exports = { startCertificateExpiryCron };
