const pool = require("../config/db");
const { auth, passwordResetTokens } = require("../utils/auth");
const {
  handlePasswordChangeAlert,
  handlePasswordResetRecovery,
  handleNewDeviceLoginCheck,
} = require("../services/securityService");

const passwordChangeInterceptor = async (req, res, next) => {
  try {
    const sessionRes = await auth.api.getSession({ headers: req.headers });
    const user = sessionRes?.user;

    if (user) {
      const dbRes = await pool.query(
        `SELECT "lastPasswordChange" FROM "user" WHERE id = $1`,
        [user.id]
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
          handlePasswordChangeAlert(user);
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
  
  let resetToken = null;
  if (req.body && req.body.token) {
    resetToken = req.body.token;
  }

  let userEmail = null;
  if (resetToken && passwordResetTokens.has(resetToken)) {
    userEmail = passwordResetTokens.get(resetToken);
  }

  res.end = function (chunk, encoding) {
    originalEnd.call(this, chunk, encoding);
    
    if (res.statusCode === 200 && userEmail) {
      passwordResetTokens.delete(resetToken);
      handlePasswordResetRecovery(userEmail);
    }
  };
  next();
};

const loginAlertInterceptor = async (req, res, next) => {
  const originalEnd = res.end;
  let email = null;
  if (req.body && req.body.email) {
    email = req.body.email;
  }

  res.end = function (chunk, encoding) {
    originalEnd.call(this, chunk, encoding);

    if (res.statusCode === 200 && email) {
      handleNewDeviceLoginCheck(email);
    }
  };
  next();
};

module.exports = {
  passwordChangeInterceptor,
  passwordResetInterceptor,
  loginAlertInterceptor,
};
