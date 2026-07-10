const pool = require("../config/db");
const { transporter } = require("../utils/mailer");
const {
  getPasswordChangedEmail,
  getNewDeviceLoginEmail,
  getPasswordRecoveredEmail,
} = require("../utils/emailTemplates");
const { getOrgSettings } = require("../utils/settings");

const redactEmail = (email) => {
  if (!email || typeof email !== "string") return "[REDACTED]";
  const parts = email.split("@");
  if (parts.length !== 2) return "[REDACTED]";
  const local = parts[0];
  const domain = parts[1];
  if (local.length <= 2) return `*@${domain}`;
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`;
};

const handlePasswordChangeAlert = async (user) => {
  try {
    await pool.query(
      `UPDATE "user" SET "lastPasswordChange" = NOW() WHERE id = $1`,
      [user.id],
    );

    const { orgFooterText, supportEmail } = await getOrgSettings();
    await transporter.sendMail(getPasswordChangedEmail(user, orgFooterText, supportEmail));
    console.log("Password change email sent to user ID:", user.id);
  } catch (err) {
    console.error("Password change service error:", err);
  }
};

const handlePasswordResetRecovery = async (userEmail) => {
  try {
    const userRes = await pool.query(
      `SELECT id, name, email FROM "user" WHERE email = $1`,
      [userEmail],
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];

      await pool.query(`DELETE FROM session WHERE "userId" = $1`, [user.id]);
      console.log(`Security: Revoked all sessions for user ${user.id}`);

      await pool.query(
        `UPDATE "user" SET "lastPasswordChange" = NOW() WHERE id = $1`,
        [user.id],
      );
      console.log("Updated lastPasswordChange");

      await transporter.sendMail(getPasswordRecoveredEmail(user));
    } else {
      console.log("User not found in user table for email:", redactEmail(userEmail));
    }
  } catch (err) {
    console.error("Password reset recovery error:", err);
  }
};

const handleNewDeviceLoginCheck = async (email) => {
  try {
    const userRes = await pool.query(
      `SELECT id, name, email FROM "user" WHERE email = $1`,
      [email],
    );
    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];

      const sessionRes = await pool.query(
        `SELECT * FROM session WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT 1`,
        [user.id],
      );

      if (sessionRes.rows.length > 0) {
        const session = sessionRes.rows[0];
        const countRes = await pool.query(
          `SELECT COUNT(*) FROM session WHERE "userId" = $1 AND "userAgent" = $2`,
          [user.id, session.userAgent],
        );

        if (parseInt(countRes.rows[0].count) === 1) {
          await transporter.sendMail(getNewDeviceLoginEmail(user, session));
        }
      }
    }
  } catch (err) {
    console.error("New device login check error:", err);
  }
};

module.exports = {
  handlePasswordChangeAlert,
  handlePasswordResetRecovery,
  handleNewDeviceLoginCheck,
};
