const { createAuthMiddleware, APIError } = require("better-auth/api");
const { transporter } = require("./mailer");
const { getPasswordChangedEmail, getPasswordRecoveredEmail } = require("./emailTemplates");
const pool = require("../config/db");

const passwordChangeCooldownHook = createAuthMiddleware(async (ctx) => {
  console.log("BEFORE HOOK TRIGGERED. Path:", ctx.path);
  if (ctx.path && ctx.path.includes("change-password")) {
    const userId = ctx.context?.session?.userId || ctx.context?.user?.id;
    console.log("Change password intercepted for user:", userId);
    if (userId) {
      try {
        const res = await pool.query(
          `SELECT "lastPasswordChange" FROM "user" WHERE id = $1`,
          [userId],
        );
        if (res.rows.length > 0) {
          const lastChange = res.rows[0].lastPasswordChange;
          if (lastChange) {
            const hoursSinceChange =
              (Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60);
            if (hoursSinceChange < 24) {
              const remaining = Math.ceil(24 - hoursSinceChange);
              throw new APIError("FORBIDDEN", {
                message: `You cannot change your password within 24 hours of a previous change. Please try again in ${remaining} hours, or use Forgot Password to reset it securely.`,
              });
            }
          }
        }
      } catch (err) {
        if (err instanceof APIError) throw err;
        console.error("Error checking cooldown:", err);
      }
    }
  }
});

const passwordChangeNotificationHook = createAuthMiddleware(async (ctx) => {
  console.log(
    "AFTER HOOK TRIGGERED. Path:",
    ctx.path,
    "Status:",
    ctx.response?.status,
  );

  if (
    ctx.path &&
    (ctx.path.includes("change-password") ||
      ctx.path.includes("reset-password"))
  ) {
    console.log("Password change/reset success detected!");
    let user = ctx.context?.session?.user || ctx.context?.user;
    let userId = user?.id;
    if (!user && ctx.body?.email) {
      try {
        const res = await pool.query(`SELECT * FROM "user" WHERE email = $1`, [
          ctx.body.email,
        ]);
        if (res.rows.length > 0) {
          user = res.rows[0];
          userId = user.id;
        }
      } catch (e) {
        console.error("Error fetching user for reset-password hook:", e);
      }
    }

    if (userId) {
      try {
        await pool.query(
          `UPDATE "user" SET "lastPasswordChange" = NOW() WHERE id = $1`,
          [userId],
        );
      } catch (dbErr) {
        console.error("Failed to update lastPasswordChange timestamp:", dbErr);
      }
      if (user.email) {
        if (ctx.path.includes("reset-password")) {
          const { handlePasswordResetRecovery } = require("../services/securityService");
          handlePasswordResetRecovery(user.email);
        } else {
          const mailOptions = getPasswordChangedEmail(user);
          try {
            await transporter.sendMail(mailOptions);
            console.log("Password change notification email sent to", user.email);
          } catch (err) {
            console.error("Failed to send password change email:", err);
          }
        }
      }
    }
  }
});

const loginNotificationHook = createAuthMiddleware(async (ctx) => {
  if (ctx.path && ctx.path.includes("sign-in/email") && ctx.response?.status === 200) {
    let email = ctx.body?.email;
    if (email) {
      const { handleNewDeviceLoginCheck } = require("../services/securityService");
      handleNewDeviceLoginCheck(email);
    }
  }
});

module.exports = {
  passwordChangeCooldownHook,
  passwordChangeNotificationHook,
  loginNotificationHook,
};
