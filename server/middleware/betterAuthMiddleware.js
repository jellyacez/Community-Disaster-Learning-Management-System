const pool = require("../config/db");
const { auth } = require("../utils/auth");
const { getPasswordChangedEmail } = require("../utils/emailTemplates");
const { transporter } = require("../utils/mailer");

// Middleware to protect routes and attach user info to req.user
const betterAuthMiddleware = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = session.user;
    next();
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
};

const passwordChangeInterceptor = async (req, res, next) => {
  try {
    const sessionRes = await auth.api.getSession({ headers: req.headers });
    const user = sessionRes?.user;

    if (user) {
      const dbRes = await pool.query(
        `SELECT "lastPasswordChange" FROM "user" WHERE id = $1`,
        [user.id],
      );
      if (dbRes.rows.length > 0) {
        const lastChange = dbRes.rows[0].lastPasswordChange;
        if (lastChange) {
          const hoursSinceChange =
            (Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60);
          if (hoursSinceChange < 24) {
            return res.status(403).json({
              message: "You cannot change your password again within 24 hours.",
            });
          }
        }
      }

      const originalEnd = res.end;
      res.end = function (chunk, encoding) {
        if (res.statusCode === 200) {
          pool
            .query(
              `UPDATE "user" SET "lastPasswordChange" = NOW() WHERE id = $1`,
              [user.id],
            )
            .catch(console.error);

          transporter
            .sendMail(getPasswordChangedEmail(user))
            .then(() =>
              console.log("Password change email sent to", user.email),
            )
            .catch(console.error);
        }
        originalEnd.call(this, chunk, encoding);
      };
    }
  } catch (err) {
    console.error("Express password hook error:", err);
  }
  next();
};

const passwordResetInterceptor = async (req, res, next) => {
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    if (res.statusCode === 200) {
      // Logic for password reset successful
    }
    originalEnd.call(this, chunk, encoding);
  };
  next();
};

module.exports = {
  betterAuthMiddleware,
  passwordChangeInterceptor,
  passwordResetInterceptor
};
