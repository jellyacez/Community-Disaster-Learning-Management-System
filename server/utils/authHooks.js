const { APIError } = require("better-auth/api");
const pool = require("../config/db");
const securityService = require("../services/securityService");
const { CONSENT_VERSION } = require("../config/constants");
const { logActivity, logError } = require("./logger");
const alertMonitorService = require("../services/alertMonitorService");

const SESSION_LIMITS = {
  resident: 5,
  barangay_admin: 3,
  mdrrmo_admin: 3,
  head_mdrrmo_admin: 2,
  system_admin: 2,
};
const DEFAULT_SESSION_LIMIT = 3;

const securityHooksPlugin = () => {
  return {
    id: "security-hooks",
    hooks: {
      before: [
        {
          matcher(context) {
            return context.path?.includes("sign-in") || false;
          },
          handler: async (ctx) => {
            const email = ctx.body?.email;
            if (email) {
              try {
                const normalizedEmail = email.toLowerCase();
                const res = await pool.query(
                  `SELECT archived FROM "user" WHERE email = $1`,
                  [normalizedEmail],
                );
                if (res.rows.length > 0 && res.rows[0].archived) {
                  throw new APIError("FORBIDDEN", {
                    message: "This account has been archived. Please contact an administrator.",
                  });
                }
              } catch (err) {
                if (err instanceof APIError) throw err;
                console.error("Error checking archive status:", err);
                throw new APIError("INTERNAL_SERVER_ERROR", {
                  message: "Unable to verify account status. Please try again later."
                });
              }
            }
            return {};
          },
        },
        {
          matcher(context) {
            return context.path === "/sign-up/email";
          },
          handler: async (ctx) => {
            const password = ctx.body?.password;
            if (typeof password !== "string" || !/^(?=.*[A-Z])(?=.*[!@#$%^&*_=+\-/.]).{8,}$/.test(password)) {
              throw new APIError("UNPROCESSABLE_ENTITY", {
                code: "WEAK_PASSWORD",
                message: "Use at least 8 characters, with 1 uppercase letter and 1 symbol.",
              });
            }

            const rawBarangay = ctx.body?.barangay || ctx.body?.barangay_id;
            let barangayFound = false;
            if (rawBarangay) {
              try {
                if (!isNaN(rawBarangay) && Number.isInteger(Number(rawBarangay))) {
                  const bCheck = await pool.query(
                    `SELECT 1 FROM barangays WHERE id = $1`,
                    [Number(rawBarangay)]
                  );
                  barangayFound = bCheck.rows.length > 0;
                } else if (typeof rawBarangay === "string" && rawBarangay.trim()) {
                  const bCheck = await pool.query(
                    `SELECT 1 FROM barangays WHERE LOWER(TRIM(name)) = LOWER($1)`,
                    [rawBarangay.trim()]
                  );
                  barangayFound = bCheck.rows.length > 0;
                }
              } catch (err) {
                logError("signup_barangay_check_failure", { message: err.message });
                throw new APIError("INTERNAL_SERVER_ERROR", {
                  message: "We couldn't check your barangay. Please try again.",
                });
              }
            }
            if (!barangayFound) {
              throw new APIError("UNPROCESSABLE_ENTITY", {
                code: "INVALID_BARANGAY",
                message: "Choose your barangay from the list.",
              });
            }

            const rawEmail = ctx.body?.email;
            if (typeof rawEmail !== "string" || !rawEmail.trim()) return {};

            let existing;
            try {
              existing = await ctx.context.internalAdapter.findUserByEmail(rawEmail.trim().toLowerCase());
            } catch (err) {
              logError("signup_duplicate_check_failure", { message: err.message });
              return {};
            }

            if (existing?.user) {
              throw new APIError("UNPROCESSABLE_ENTITY", {
                code: "USER_ALREADY_EXISTS",
                message: "An account with this email already exists. Please sign in or reset your password.",
              });
            }
            return {};
          },
        },
        {
          matcher(context) {
            return context.path?.includes("sign-out") || false;
          },
          handler: async (ctx) => {
            let userId = ctx.context?.session?.userId || ctx.context?.user?.id;
            if (!userId) {
              const { auth } = require("./auth");
              const sessionContext = await auth.api.getSession({
                headers: ctx.headers,
              });
              userId = sessionContext?.user?.id;
            }
            if (userId) {
              logActivity(userId, "Logged out successfully", ctx);
            }
            return {};
          },
        },
        {
          matcher(context) {
            return context.path?.includes("change-password") || false;
          },
          handler: async (ctx) => {
            let userId = ctx.context?.session?.userId || ctx.context?.user?.id;

            if (!userId) {
              const { auth } = require("./auth");
              const sessionContext = await auth.api.getSession({
                headers: ctx.headers,
              });
              userId = sessionContext?.user?.id;
            }

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
                      (Date.now() - new Date(lastChange).getTime()) /
                      (1000 * 60 * 60);
                    if (hoursSinceChange < 24) {
                      const remainingHours = 24 - hoursSinceChange;
                      let timeText = "";
                      if (remainingHours < 1) {
                        const remainingMins = Math.ceil(remainingHours * 60);
                        timeText = `${remainingMins} minute${remainingMins !== 1 ? "s" : ""}`;
                      } else {
                        const remaining = Math.ceil(remainingHours);
                        timeText = `${remaining} hour${remaining !== 1 ? "s" : ""}`;
                      }

                      throw new APIError("FORBIDDEN", {
                        message: `You cannot change your password within 24 hours of a previous change. Please try again in ${timeText}, or use Forgot Password to reset it securely.`,
                      });
                    }
                  }
                }
              } catch (err) {
                if (err instanceof APIError) throw err;
                console.error("Error checking cooldown:", err);
              }
            }
            return {};
          },
        },
      ],
      after: [
        {
          matcher(context) {
            return (
              context.path?.includes("sign-in") ||
              context.path?.includes("callback/") ||
              false
            );
          },
          handler: async (ctx) => {
            if (ctx.context?.returned instanceof APIError) return {};

            let userId =
              ctx.context?.session?.user?.id ||
              ctx.context?.user?.id ||
              ctx.context?.newSession?.user?.id;

            if (!userId) {
              try {
                if (
                  ctx.response &&
                  typeof ctx.response.clone === "function" &&
                  ctx.response.status < 300
                ) {
                  const clone = ctx.response.clone();
                  const data = await clone.json();
                  userId = data?.user?.id;
                }
              } catch { /* non-critical */ }
            }

            if (!userId) {
              try {
                const setCookie = ctx.response?.headers?.get("set-cookie");
                if (setCookie) {
                  const match = setCookie.match(
                    /(?:__Secure-|__Host-)?better-auth\.session_token=([^;]+)/,
                  );
                  if (match) {
                    const sessionRes = await pool.query(
                      `SELECT "userId" FROM session WHERE token = $1`,
                      [match[1]],
                    );
                    if (sessionRes.rows.length > 0) {
                      userId = sessionRes.rows[0].userId;
                    }
                  }
                }
              } catch { /* non-critical */ }
            }

            if (!userId) return {};

            try {
              const userRes = await pool.query(
                `SELECT role FROM "user" WHERE id = $1`,
                [userId],
              );
              if (userRes.rows.length === 0) return {};

              const { role } = userRes.rows[0];
              const limit = SESSION_LIMITS[role] ?? DEFAULT_SESSION_LIMIT;

              const countRes = await pool.query(
                `SELECT COUNT(*) FROM session
                 WHERE "userId" = $1 AND "expiresAt" > NOW()`,
                [userId],
              );
              const totalActive = parseInt(countRes.rows[0]?.count ?? "0", 10);

              if (totalActive > limit) {
                const evictCount = totalActive - limit;
                await pool.query(
                  `DELETE FROM session
                   WHERE id IN (
                     SELECT id FROM session
                     WHERE "userId" = $1 AND "expiresAt" > NOW()
                     ORDER BY "createdAt" ASC
                     LIMIT $2
                   )`,
                  [userId, evictCount],
                );
                try {
                  logActivity(
                    userId,
                    `Session limit enforced (${limit} for role '${role}'): ${evictCount} oldest session(s) evicted.`,
                    ctx,
                  );
                } catch { /* non-critical */ }
              }
            } catch (err) {
              logError("session_limit_enforcement_error", {
                message: err.message,
                stack: err.stack,
              });
            }
            return {};
          },
        },
        {
          matcher(context) {
            return context.path?.includes("sign-up") || false;
          },
          handler: async (ctx) => {
            if (ctx.context?.returned instanceof APIError) return {};
            
            let user =
              ctx.context?.newSession?.user ||
              ctx.context?.user ||
              ctx.context?.returned?.user;
            let userId = user?.id;

            if (!user) {
              try {
                let responseData = null;
                if (ctx.response && typeof ctx.response.clone === "function") {
                  const clone = ctx.response.clone();
                  responseData = await clone.json();
                } else if (ctx.responseBody) {
                  responseData = typeof ctx.responseBody === "string" ? JSON.parse(ctx.responseBody) : ctx.responseBody;
                }
                if (responseData?.user) {
                  user = responseData.user;
                  userId = user.id;
                }
              } catch (e) {
                console.error("Non-critical error extracting user on sign-up:", e.message);
              }
            }

            if (!userId && ctx.body?.email) {
              try {
                const uRes = await pool.query(
                  'SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)',
                  [ctx.body.email.trim()]
                );
                if (uRes.rows.length > 0) {
                  userId = uRes.rows[0].id;
                }
              } catch (e) {
                console.error("Non-critical error looking up user by email on sign-up:", e.message);
              }
            }

            if (userId) {
              try {
                await pool.query(
                  `UPDATE "user" 
                   SET consent_given_at = CURRENT_TIMESTAMP, 
                       consent_version = $1
                   WHERE id = $2`,
                  [CONSENT_VERSION, userId]
                );

                const rawBarangay = ctx.body?.barangay || ctx.body?.barangay_id;
                if (rawBarangay) {
                  let resolvedBarangayId = null;
                  if (!isNaN(rawBarangay) && Number.isInteger(Number(rawBarangay))) {
                    const bCheck = await pool.query(
                      `SELECT id FROM barangays WHERE id = $1`,
                      [Number(rawBarangay)]
                    );
                    if (bCheck.rows.length > 0) resolvedBarangayId = bCheck.rows[0].id;
                  } else {
                    const cleanName = String(rawBarangay).trim();
                    const bCheck = await pool.query(
                      `SELECT id FROM barangays WHERE LOWER(TRIM(name)) = LOWER($1)`,
                      [cleanName]
                    );
                    if (bCheck.rows.length > 0) resolvedBarangayId = bCheck.rows[0].id;
                  }
                  if (resolvedBarangayId) {
                    await pool.query(
                      `UPDATE "user" SET barangay_id = $1 WHERE id = $2`,
                      [resolvedBarangayId, userId]
                    );
                  }
                }

                logActivity(userId, `Account created with explicit data privacy consent (${CONSENT_VERSION})`, ctx);
              } catch (err) {
                logError('consent_stamp_failure', {
                  userId: userId,
                  message: err.message,
                  stack: err.stack
                });
              }
            }
            return {};
          },
        },
        {
          matcher(context) {
            return (
              context.path?.includes("change-password") ||
              context.path?.includes("reset-password") ||
              false
            );
          },
          handler: async (ctx) => {
            if (ctx.context?.returned instanceof APIError) return {};

            let user = ctx.context?.session?.user || ctx.context?.user;
            let userId = user?.id;

            if (!user) {
              try {
                let responseData = null;
                if (ctx.response && typeof ctx.response.clone === "function") {
                  const clone = ctx.response.clone();
                  responseData = await clone.json();
                } else if (ctx.context?.newSession?.user) {
                  user = ctx.context.newSession.user;
                } else if (ctx.responseBody) {
                  responseData =
                    typeof ctx.responseBody === "string"
                      ? JSON.parse(ctx.responseBody)
                      : ctx.responseBody;
                }

                if (responseData?.user) user = responseData.user;
                if (user) userId = user.id;
              } catch (e) {
                console.error("Non-critical error extracting user:", e.message);
              }
            }

            if (!user && ctx.body?.email) {
              try {
                const normalizedEmail = ctx.body.email.toLowerCase();
                const res = await pool.query(
                  `SELECT * FROM "user" WHERE email = $1`,
                  [normalizedEmail],
                );
                if (res.rows.length > 0) {
                  user = res.rows[0];
                  userId = user.id;
                }
              } catch (e) {
                console.error("Error fetching user fallback:", e);
              }
            }

            if (userId && user.email) {
              if (ctx.path?.includes("reset-password")) {
                securityService.handlePasswordResetRecovery(user.email);
                logActivity(userId, "Reset password", ctx);
              } else {
                securityService.handlePasswordChangeAlert(user);
                logActivity(userId, "Changed password", ctx);
              }
            }
            return {};
          },
        },
        {
          matcher(context) {
            return (
              context.path?.includes("sign-in") ||
              context.path?.includes("callback/") ||
              false
            );
          },
          handler: async (ctx) => {
            let email = ctx.body?.email;

            if (ctx.context?.returned instanceof APIError) {
              if (email) {
                try {
                  const res = await pool.query(
                    `SELECT id FROM "user" WHERE email = $1`,
                    [email.toLowerCase()],
                  );
                  if (res.rows.length > 0) {
                    logActivity(
                      res.rows[0].id,
                      "Failed login attempt",
                      ctx,
                    );
                  }
                } catch (e) {
                  console.error("Failed to log failed login attempt:", e);
                }
              }
              return {};
            }

            let user =
              ctx.context?.session?.user ||
              ctx.context?.user ||
              ctx.context?.newSession?.user;
            let userId = user?.id;

            if (!userId) {
              try {
                let responseData = null;
                if (ctx.response && typeof ctx.response.clone === "function") {
                  if (ctx.response.status < 300) {
                    const clone = ctx.response.clone();
                    responseData = await clone.json();
                  }
                } else if (ctx.responseBody) {
                  responseData =
                    typeof ctx.responseBody === "string"
                      ? JSON.parse(ctx.responseBody)
                      : ctx.responseBody;
                }
                if (responseData?.user) {
                  user = responseData.user;
                  userId = user.id;
                }
              } catch (e) {
                console.error(
                  "Non-critical error extracting user from response:",
                  e.message,
                );
              }
            }

            if (!userId && ctx.response?.headers) {
              try {
                const setCookie = ctx.response.headers.get("set-cookie");
                if (setCookie) {
                  const match = setCookie.match(
                    /(?:__Secure-|__Host-)?better-auth\.session_token=([^;]+)/,
                  );
                  if (match) {
                    const token = match[1];
                    const sessionRes = await pool.query(
                      `SELECT "userId" FROM "session" WHERE token = $1`,
                      [token],
                    );
                    if (sessionRes.rows.length > 0) {
                      userId = sessionRes.rows[0].userId;
                    }
                  }
                }
              } catch (e) {
                console.error("Error extracting session from cookie:", e);
              }
            }

            if (!userId && email) {
              try {
                const res = await pool.query(
                  `SELECT id, email FROM "user" WHERE email = $1`,
                  [email.toLowerCase()],
                );
                if (res.rows.length > 0) {
                  userId = res.rows[0].id;
                  email = res.rows[0].email;
                }
              } catch (e) {
                console.error("Error fetching user by email:", e);
              }
            }

            if (userId && !email) {
              try {
                const res = await pool.query(
                  `SELECT email FROM "user" WHERE id = $1`,
                  [userId],
                );
                if (res.rows.length > 0) {
                  email = res.rows[0].email;
                }
              } catch (e) {
                console.error("Error fetching email by userId:", e);
              }
            }

            email = email || user?.email;

            if (userId) {
              console.log("[IP DEBUG]", {
  requestIp: ctx.request?.ip,
  socketAddress: ctx.request?.socket?.remoteAddress,
  headersType: ctx.request?.headers?.constructor?.name,
  forwardedFor: ctx.request?.headers?.get?.("x-forwarded-for"),
  realIp: ctx.request?.headers?.get?.("x-real-ip"),
  cfConnectingIp: ctx.request?.headers?.get?.("cf-connecting-ip"),
});

              logActivity(userId, "Logged in successfully", ctx);
              if (email) {
                securityService.handleNewDeviceLoginCheck(email);
              }
            }
            return {};
          },
        },
        {
          matcher(context) {
            return (
              context.path?.includes("two-factor/verify-totp") ||
              context.path?.includes("two-factor/verify-otp") ||
              false
            );
          },
          handler: async (ctx) => {
            if (ctx.context?.returned instanceof APIError) return {};
            const userId =
              ctx.context?.session?.user?.id ||
              ctx.context?.user?.id ||
              ctx.context?.newSession?.user?.id;
            if (userId) {
              try {
                await pool.query(
                  `UPDATE "user" SET "twoFactorEnabled" = true WHERE id = $1`,
                  [userId],
                );
              } catch (e) {
                console.error("Error setting twoFactorEnabled to true:", e);
                alertMonitorService.setAlert("2FA_STATE_DESYNC", {
                  type: "danger",
                  title: "2FA State Desynchronization",
                  message: `Database failed to enable 2FA for user ${userId} despite successful verification.`
                });
              }
            }
            return {};
          },
        },
        {
          matcher(context) {
            return context.path?.includes("two-factor/disable") || false;
          },
          handler: async (ctx) => {
            if (ctx.context?.returned instanceof APIError) return {};
            const userId =
              ctx.context?.session?.user?.id ||
              ctx.context?.user?.id ||
              ctx.context?.newSession?.user?.id;
            if (userId) {
              try {
                await pool.query(
                  `UPDATE "user" SET "twoFactorEnabled" = false WHERE id = $1`,
                  [userId],
                );
              } catch (e) {
                console.error("Error setting twoFactorEnabled to false:", e);
                alertMonitorService.setAlert("2FA_STATE_DESYNC", {
                  type: "danger",
                  title: "2FA State Desynchronization",
                  message: `Database failed to disable 2FA for user ${userId} despite successful verification.`
                });
              }
            }
            return {};
          },
        },
      ],
    },
  };
};

module.exports = { securityHooksPlugin };