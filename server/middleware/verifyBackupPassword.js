// Reauthenticate the current session; never accept an email/user ID from the form.
const BACKUP_ROLES = new Set(["system_admin", "super_admin"]);

function createBackupPasswordVerifier(getAuth) {
  return async function verifyBackupPassword(req, res, next) {
    res.set("Cache-Control", "no-store");

    if (!req.user) {
      return res
        .status(401)
        .json({ error: "Sign in before creating a backup." });
    }
    if (!BACKUP_ROLES.has(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Your role cannot create database backups." });
    }
    if (req.isImpersonating || req.impersonator || req.user.isImpersonated) {
      return res
        .status(403)
        .json({ error: "Exit impersonation before creating a backup." });
    }

    const accountPassword = req.body?.accountPassword;
    if (
      typeof accountPassword !== "string" ||
      !accountPassword ||
      Buffer.byteLength(accountPassword, "utf8") > 1024
    ) {
      return res
        .status(400)
        .json({ error: "Enter your account password (maximum 1024 bytes)." });
    }

    try {
      const auth = getAuth();
      if (typeof auth.api.verifyPassword !== "function") {
        return res
          .status(503)
          .json({ error: "Account password verification is unavailable." });
      }

      // Bypass the session cookie cache when checking the current account and role.
      const session = await auth.api.getSession({
        headers: req.headers,
        query: { disableCookieCache: true },
      });
      if (!session?.user) {
        return res
          .status(401)
          .json({ error: "Your session expired. Sign in again." });
      }
      if (
        String(session.user.id) !== String(req.user.id) ||
        !BACKUP_ROLES.has(session.user.role) ||
        session.user.banned ||
        session.user.archived
      ) {
        return res
          .status(403)
          .json({ error: "This session cannot create database backups." });
      }

      const result = await auth.api.verifyPassword({
        headers: req.headers,
        body: { password: accountPassword },
      });
      if (result?.status !== true) {
        return res
          .status(403)
          .json({ error: "Account password could not be verified." });
      }

      // Do not carry the submitted credential into the backup controller.
      delete req.body.accountPassword;
      return next();
    } catch {
      // Auth exceptions can contain request data. Never log them here.
      return res
        .status(403)
        .json({ error: "Account password could not be verified. Try again." });
    } finally {
      if (req.body) delete req.body.accountPassword;
    }
  };
}

const verifyBackupPassword = createBackupPasswordVerifier(
  () => require("../utils/auth").auth,
);

module.exports = {
  verifyBackupPassword,
  createBackupPasswordVerifier,
};
