const pool = require("../config/db");
const { transporter } = require("../utils/mailer");
const { getAccountNoticeEmail } = require("../utils/emailTemplates");
const { getOrgSettings } = require("../utils/settings");

/**
 * Emails a user about a change to their account. Never throws: a mail failure
 * must not fail the admin action that triggered it (mailer.js raises SMTP_DOWN).
 *
 * @param {string|{name, email}} userOrId - user id, or { name, email } when the row is already gone (deletion)
 * @param {string} kind - a key of NOTICES in templates/accountNotices.js
 * @param {object} [details]
 */
const sendAccountNotice = async (userOrId, kind, details = {}) => {
  try {
    let user = userOrId;
    if (typeof userOrId !== "object") {
      const { rows } = await pool.query(`SELECT name, email FROM "user" WHERE id = $1`, [userOrId]);
      user = rows[0];
    }
    if (!user?.email) return;

    const { orgFooterText, supportEmail } = await getOrgSettings();
    await transporter.sendMail(getAccountNoticeEmail(kind, user, details, orgFooterText, supportEmail));
  } catch (err) {
    console.error(`Account notice email (${kind}) failed:`, err.message);
  }
};

module.exports = { sendAccountNotice };
