const pool = require("../config/db");
const { transporter } = require("../utils/mailer");
const {
  getPasswordChangedEmail,
  getNewDeviceLoginEmail,
  getPasswordRecoveredEmail,
} = require("../utils/emailTemplates");
const { getOrgSettings } = require("../utils/settings");
const alertMonitorService = require("./alertMonitorService");
const { deviceKey } = require("../utils/userAgent");

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

    await transporter.sendMail(getPasswordChangedEmail(user, await getOrgSettings()));
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

      await transporter.sendMail(getPasswordRecoveredEmail(user, await getOrgSettings()));
    } else {
      console.log("User not found in user table for email:", redactEmail(userEmail));
    }
  } catch (err) {
    console.error("Password reset recovery error:", err);
    alertMonitorService.setAlert("SECURITY_SERVICE_ERROR", {
      type: "danger",
      title: "Password Reset Failure",
      message: "A password reset recovery process failed to complete securely. Old sessions may not have been revoked.",
    });
  }
};

// Records the device in user_known_devices and says whether it was new. The insert is the test:
// only the call that inserts the row gets it back, so two simultaneous sign-ins send one email.
const rememberDevice = async (userId, userAgent) => {
  const device = deviceKey(userAgent);
  if (!device) return false;
  const { rowCount } = await pool.query(
    `INSERT INTO user_known_devices (user_id, browser_family, os_family)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, browser_family, os_family) DO NOTHING`,
    [userId, device.browserFamily, device.osFamily],
  );
  if (rowCount === 1) return true;
  await pool.query(
    `UPDATE user_known_devices SET last_seen_at = NOW()
     WHERE user_id = $1 AND browser_family = $2 AND os_family = $3`,
    [userId, device.browserFamily, device.osFamily],
  );
  return false;
};

// A device is new when the user has never signed in from this browser family and OS. Known devices
// outlive sessions: sign-out, expiry, force-logout-all and restores all delete session rows.
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
        if (await rememberDevice(user.id, session.userAgent)) {
          await transporter.sendMail(getNewDeviceLoginEmail(user, session, await getOrgSettings()));
        }
      }
    }
  } catch (err) {
    console.error("New device login check error:", err);
  }
};

// Seeds user_known_devices from the sessions that exist, so users who are signed in when this ships
// are not emailed about devices they already use. Runs at every server start: it is one scan of the
// session table (a row per user and User-Agent) and an INSERT ... DO NOTHING, so a repeat adds
// nothing. The migration cannot do it because User-Agents are normalised in JS (utils/userAgent.js).
// Returns how many rows it added.
const backfillKnownDevices = async () => {
  const { rows } = await pool.query(
    `SELECT "userId", "userAgent", MIN("createdAt") AS first_seen, MAX("updatedAt") AS last_seen
     FROM session WHERE "userAgent" IS NOT NULL GROUP BY "userId", "userAgent"`,
  );
  const devices = new Map();
  for (const row of rows) {
    const device = deviceKey(row.userAgent);
    if (!device) continue;
    const key = JSON.stringify([row.userId, device.browserFamily, device.osFamily]);
    const known = devices.get(key);
    if (!known) {
      devices.set(key, { userId: row.userId, ...device, first: row.first_seen, last: row.last_seen });
    } else {
      if (row.first_seen < known.first) known.first = row.first_seen;
      if (row.last_seen > known.last) known.last = row.last_seen;
    }
  }
  if (devices.size === 0) return 0;
  // Fixed insert order: two processes starting together (pm2) lock rows in the same order, so they cannot deadlock.
  const list = [...devices.values()].sort((a, b) =>
    a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : a.browserFamily < b.browserFamily ? -1 : a.browserFamily > b.browserFamily ? 1 : a.osFamily < b.osFamily ? -1 : a.osFamily > b.osFamily ? 1 : 0);
  const { rowCount } = await pool.query(
    `INSERT INTO user_known_devices (user_id, browser_family, os_family, first_seen_at, last_seen_at)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::timestamptz[], $5::timestamptz[])
     ON CONFLICT (user_id, browser_family, os_family) DO NOTHING`,
    [list.map((d) => d.userId), list.map((d) => d.browserFamily), list.map((d) => d.osFamily), list.map((d) => d.first), list.map((d) => d.last)],
  );
  return rowCount;
};

module.exports = {
  handlePasswordChangeAlert,
  handlePasswordResetRecovery,
  handleNewDeviceLoginCheck,
  backfillKnownDevices,
};
