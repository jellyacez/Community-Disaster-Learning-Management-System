const cron = require("node-cron");
const pool = require("../config/db");
const logger = require("./logger");
const { transporter } = require("./mailer");
const { getRecertificationReminderEmail } = require("./emailTemplates");
const { notifyUser } = require("../services/notif/userNotificationService");

/**
 * Expires lapsed certificates, then emails one recertification reminder per certificate
 * within 30 days of expiry (tracked by recert_notified_at).
 */
async function runCertificateMaintenanceJob() {
  logger.logInfo("certificate_cron_start", {
    message: "Daily certificate maintenance cron starting."
  });

  // write-side backstop: flip lapsed active certificates to expired
  let expiredCount = 0;
  try {
    const expiryResult = await pool.query(`
      UPDATE certificates 
      SET status = 'expired'
      WHERE expires_at < NOW() AND status = 'active'
    `);
    expiredCount = expiryResult.rowCount;
    logger.logInfo("certificate_expiry_complete", {
      message: `Certificate expiry step finished. Marked expired: ${expiredCount}.`,
      expired_count: expiredCount
    });
  } catch (err) {
    logger.logError("certificate_expiry_error", {
      message: "Failed to flip expired certificates.",
      error: err.message,
      stack: err.stack
    });
  }

  // active certificates inside the 30-day window that haven't been reminded yet
  let notifiedCount = 0;
  let failedCount = 0;
  try {
    const candidates = await pool.query(`
      SELECT 
        c.cert_id,
        c.cert_rec,
        c.expires_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        m.modname AS module_title,
        CEIL(EXTRACT(EPOCH FROM (c.expires_at - NOW())) / 86400)::int AS days_remaining
      FROM certificates c
      JOIN "user" u ON c.user_id = u.id
      JOIN module_data m ON c.module_id = m.mod_id
      WHERE c.status = 'active'
        AND c.expires_at > NOW()
        AND c.expires_at <= NOW() + INTERVAL '30 days'
        AND c.recert_notified_at IS NULL
    `);

    for (const row of candidates.rows) {
      try {
        const emailOptions = getRecertificationReminderEmail(
          { name: row.user_name, email: row.user_email },
          row,
          row.module_title,
          Math.max(1, row.days_remaining)
        );

        await transporter.sendMail(emailOptions);

        await pool.query(
          `UPDATE certificates SET recert_notified_at = NOW() WHERE cert_id = $1`,
          [row.cert_id]
        );

        // After the stamp, so a failed email retried tomorrow doesn't duplicate this
        const days = Math.max(1, row.days_remaining);
        await notifyUser(
          row.user_id,
          "recert_reminder",
          `Your certificate for "${row.module_title}" expires in ${days} day${days === 1 ? "" : "s"}. Retake the final assessment to renew it.`
        );

        notifiedCount++;
      } catch (sendErr) {
        failedCount++;
        logger.logError("recert_notification_send_failed", {
          cert_id: row.cert_id,
          user_id: row.user_id,
          email: row.user_email,
          error: sendErr.message
        });
        // left unstamped, so the next run retries it
      }
    }

    logger.logInfo("recert_notification_complete", {
      message: `Recertification notification step finished.`,
      total_candidates: candidates.rowCount,
      notified_count: notifiedCount,
      failed_count: failedCount
    });

    return {
      expiredCount,
      candidatesCount: candidates.rowCount,
      notifiedCount,
      failedCount
    };
  } catch (queryErr) {
    logger.logError("recert_notification_query_error", {
      message: "Failed to query or process recertification notification candidates.",
      error: queryErr.message,
      stack: queryErr.stack
    });
    return {
      expiredCount,
      candidatesCount: 0,
      notifiedCount,
      failedCount
    };
  }
}

function startCertificateExpiryCron() {
  // Run once every day at 1:00 AM
  cron.schedule("0 1 * * *", async () => {
    await runCertificateMaintenanceJob();
  });

  logger.logInfo("certificate_expiry_cron_scheduled", {
    message: "Certificate expiry & recertification cron scheduled (runs daily at 1:00 AM)."
  });
}

module.exports = { startCertificateExpiryCron, runCertificateMaintenanceJob };
