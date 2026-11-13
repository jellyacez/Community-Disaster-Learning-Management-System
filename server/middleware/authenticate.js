const { auth } = require("../utils/auth");
const pool = require("../config/db");
const { logError } = require("../utils/logger");
const { MFA_REQUIRED_ROLES, isMfaEnforced } = require("../config/permissions");

// cookie-parser isn't mounted globally
const parseCookies = (req) => {
  if (req.cookies) return req.cookies;
  const list = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
};

// Session check, archive check, MFA enforcement, activity tracking and impersonation.
const authenticate = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized. Please Log In" });
    }

    // a user-agent mismatch on an existing session is treated as a stolen token
    const incomingUserAgent = req.headers["user-agent"] || "";
    const sessionRecord = session.session;

    if (sessionRecord?.userAgent && incomingUserAgent !== sessionRecord.userAgent) {
      logError("session_hijack_attempt_detected", {
        userId: session.user.id,
        expectedUserAgent: sessionRecord.userAgent,
        receivedUserAgent: incomingUserAgent,
        ip: req.ip,
      });

      try {
        await auth.api.revokeSession({
          body: { token: sessionRecord.token },
          headers: req.headers,
        });
      } catch (revokeErr) {
        logError("session_revocation_failed", { message: revokeErr.message });
      }

      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Session terminated due to client fingerprint anomaly.",
      });
    }

    if (session.user.archived) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "This account has been archived. Please contact an administrator.",
      });
    }

    if (isMfaEnforced() && MFA_REQUIRED_ROLES.includes(session.user.role)) {
      if (!session.user.twoFactorEnabled) {
        return res.status(403).json({
          error: "MFA_REQUIRED",
          message: "Multi-Factor Authentication is mandatory for this role.",
        });
      }
    }

    req.user = session.user;
    const cookies = parseCookies(req);
    const targetUserId = cookies.impersonated_target_id;
    const impersonatorId = cookies.impersonator_id;

    if (
      targetUserId &&
      impersonatorId &&
      session.user.role === "super_admin" &&
      String(session.user.id) === String(impersonatorId)
    ) {
      try {
        const targetRes = await pool.query(
          `SELECT id, name, email, role, barangay_id, archived 
           FROM public."user" 
           WHERE id = $1`,
          [targetUserId]
        );

        if (targetRes.rows.length > 0 && !targetRes.rows[0].archived) {
          const targetUser = targetRes.rows[0];
          req.impersonator = session.user;
          req.user = {
            ...session.user,
            ...targetUser,
            id: targetUser.id,
            role: targetUser.role,
            barangay_id: targetUser.barangay_id,
            barangayId: targetUser.barangay_id,
            isImpersonated: true,
          };
          req.isImpersonating = true;
        }
      } catch (impErr) {
        logError("impersonation_hydration_failure", {
          impersonatorId,
          targetUserId,
          message: impErr.message,
        });
      }
    }

    // throttled to one write a minute; feeds the online-users count
    pool
      .query(
        `
      UPDATE "user"
      SET last_active = NOW()
      WHERE id = $1
      AND (last_active IS NULL OR last_active < NOW() - INTERVAL '1 minute')
    `,
        [session.user.id]
      )
      .catch((err) => {
        logError("online_tracking_failure", {
          userId: session.user.id,
          message: err.message,
          stack: err.stack,
        });
      });

    next();
  } catch (error) {
    logError("authentication_middleware_failure", {
      route: req.originalUrl,
      method: req.method,
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Attaches req.user when a session exists; never rejects the request.
const optionalAuthenticate = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session && session.user && !session.user.archived) {
      req.user = session.user;
    }
  } catch {
    // anonymous public traffic
  }
  next();
};

module.exports = { authenticate, optionalAuthenticate };