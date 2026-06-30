const { APIError } = require("better-auth/api");
const pool = require("../config/db");
const securityService = require("../services/securityService");

const securityHooksPlugin = () => {
  return {
    id: "security-hooks",
    hooks: {
      before: [
        {
          matcher(context) {
            return context.path?.includes("change-password") || false;
          },
          handler: async (ctx) => {
            let userId = ctx.context?.session?.userId || ctx.context?.user?.id;
            
            if (!userId) {
              const { auth } = require("./auth");
              const sessionContext = await auth.api.getSession({ headers: ctx.headers });
              userId = sessionContext?.user?.id;
            }

            if (userId) {
              try {
                const res = await pool.query(
                  `SELECT "lastPasswordChange" FROM "user" WHERE id = $1`,
                  [userId]
                );
                if (res.rows.length > 0) {
                  const lastChange = res.rows[0].lastPasswordChange;
                  if (lastChange) {
                    const hoursSinceChange = (Date.now() - new Date(lastChange).getTime()) / (1000 * 60 * 60);
                    if (hoursSinceChange < 24) {
                      const remainingHours = 24 - hoursSinceChange;
                      let timeText = "";
                      if (remainingHours < 1) {
                        const remainingMins = Math.ceil(remainingHours * 60);
                        timeText = `${remainingMins} minute${remainingMins !== 1 ? 's' : ''}`;
                      } else {
                        const remaining = Math.ceil(remainingHours);
                        timeText = `${remaining} hour${remaining !== 1 ? 's' : ''}`;
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
          }
        }
      ],
      after: [
        {
          matcher(context) {
            return context.path?.includes("change-password") || context.path?.includes("reset-password") || false;
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
                  responseData = typeof ctx.responseBody === "string" ? JSON.parse(ctx.responseBody) : ctx.responseBody;
                }
                
                if (responseData?.user) user = responseData.user;
                if (user) userId = user.id;
              } catch (e) {
                console.error("Non-critical error extracting user:", e.message);
              }
            }

            if (!user && ctx.body?.email) {
              try {
                const res = await pool.query(`SELECT * FROM "user" WHERE email = $1`, [ctx.body.email]);
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
              } else {
                securityService.handlePasswordChangeAlert(user);
              }
            }
            return {};
          }
        },
        {
          matcher(context) {
            return context.path?.includes("sign-in/email") || false;
          },
          handler: async (ctx) => {
            if (ctx.context?.returned instanceof APIError) return {};
              let email = ctx.body?.email;
              if (email) {
                securityService.handleNewDeviceLoginCheck(email);
              }
            return {};
          }
        },
        {
          matcher(context) {
            return context.path?.includes("two-factor/verify-totp") || context.path?.includes("two-factor/verify-otp") || false;
          },
          handler: async (ctx) => {
            if (ctx.context?.returned instanceof APIError) return {};
            const userId = ctx.context?.session?.user?.id || ctx.context?.user?.id || ctx.context?.newSession?.user?.id;
            if (userId) {
              try {
                await pool.query(`UPDATE "user" SET "twoFactorEnabled" = true WHERE id = $1`, [userId]);
              } catch (e) {
                console.error("Error setting twoFactorEnabled to true:", e);
              }
            }
            return {};
          }
        },
        {
          matcher(context) {
            return context.path?.includes("two-factor/disable") || false;
          },
          handler: async (ctx) => {
            if (ctx.context?.returned instanceof APIError) return {};
            const userId = ctx.context?.session?.user?.id || ctx.context?.user?.id || ctx.context?.newSession?.user?.id;
            if (userId) {
              try {
                await pool.query(`UPDATE "user" SET "twoFactorEnabled" = false WHERE id = $1`, [userId]);
              } catch (e) {
                console.error("Error setting twoFactorEnabled to false:", e);
              }
            }
            return {};
          }
        }
      ]
    }
  };
};

module.exports = { securityHooksPlugin };
