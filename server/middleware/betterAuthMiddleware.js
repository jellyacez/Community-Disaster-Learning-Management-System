const pool = require("../config/db");
const { auth } = require("../utils/auth");
const {
  getPasswordChangedEmail,
  getNewDeviceLoginEmail,
} = require("../utils/emailTemplates");
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

// This interceptor is a placeholder for any future logic you want to implement after a password reset,
//  such as logging or sending notifications. Currently, it does not perform any actions but can be
// easily extended in the future.
const passwordResetInterceptor = async (req, res, next) => {
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    if (res.statusCode === 200) {
      try {
        const reqBody = req.body;
        if (reqBody && reqBody.newPassword) {
        }
      } catch (e) {}
    }
    originalEnd.call(this, chunk, encoding);
  };
  next();
};

const loginAlertInterceptor = async (req, res, next) => {
  const originalEnd = res.end;
  let email = null;
  if (req.body && req.body.email) {
    email = req.body.email;
  }

  res.end = async function (chunk, encoding) {
    originalEnd.call(this, chunk, encoding);

    if (res.statusCode === 200 && email) {
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
              transporter
                .sendMail(getNewDeviceLoginEmail(user, session))
                .catch(console.error);
            }
          }
        }
      } catch (err) {
        console.error("Login alert background error:", err);
      }
    }
  };
  next();
};

module.exports = {
  betterAuthMiddleware,
  passwordChangeInterceptor,
  passwordResetInterceptor,
  loginAlertInterceptor,
};
