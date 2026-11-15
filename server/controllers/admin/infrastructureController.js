const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const os = require("node:os");
const secureBackup = require("../../services/secureBackup");
const pool = require("../../config/db");
const {
  clearMaintenanceCache,
} = require("../../middleware/maintenanceMiddleware");

const runPostgresCommand = promisify(execFile);
// This lock covers one Node process. Restore requires a single app instance.
let databaseOperationRunning = false;

function getDatabaseArguments() {
  return [
    "-U",
    process.env.DB_USER || "postgres",
    "-h",
    process.env.DB_HOST || "localhost",
    "-p",
    String(process.env.DB_PORT || 5432),
    "-d",
    process.env.DB_DATABASE || "LMS_db",
  ];
}

function getCommandOptions() {
  return {
    env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || "" },
    timeout: 300000,
    maxBuffer: 1024 * 1024,
  };
}

async function logDatabaseActivity(req, message) {
  try {
    await require("../../utils/logger").logActivity(req.user.id, message);
  } catch {
    // Logging must not change the result of a completed database operation.
    console.warn("Database activity could not be recorded.");
  }
}

function getSafetyDumpPath() {
  return path.resolve(
    process.env.RESTORE_SAFETY_DUMP_PATH ||
      path.join(__dirname, "..", "..", "backups", "pre-restore-safety.dump"),
  );
}

// Snapshot of the live database taken right before a restore. Server-side only;
// overwritten each time. Encrypted exactly like a downloaded backup (same key and
// ZIP password), so it can be restored through the same dialog. The plaintext dump
// exists only in a fresh private directory; the ZIP is renamed into place, so a
// symlink planted at either path is never followed.
async function takeSafetyDump() {
  const target = getSafetyDumpPath();
  await fsp.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const workDirectory = await fsp.mkdtemp(
    path.join(path.dirname(target), ".safety-"),
  );
  const dumpPath = path.join(workDirectory, "database.dump");
  const zipPath = path.join(workDirectory, "database.zip");
  try {
    await runPostgresCommand(
      process.env.PG_DUMP_PATH || "pg_dump",
      [...getDatabaseArguments(), "--no-password", "-F", "c", "-f", dumpPath],
      getCommandOptions(),
    );
    // Throws (and so aborts the restore) if the key or ZIP password is not
    // configured, or the dump exceeds the 64 MiB backup limit.
    const zip = await secureBackup.pack(
      await fsp.readFile(dumpPath),
      process.env.BACKUP_ZIP_PASSWORD,
    );
    await fsp.writeFile(zipPath, zip, { mode: 0o600 });
    await fsp.chmod(zipPath, 0o600);
    await fsp.rename(zipPath, target);
  } finally {
    await removeTemporaryDirectory(workDirectory);
  }
  return target;
}

async function removeTemporaryDirectory(directory) {
  if (!directory) return;
  try {
    await fsp.rm(directory, { recursive: true, force: true });
  } catch {
    console.warn("A database operation temporary directory needs cleanup.");
  }
}

// Account-password verification is performed by the route middleware first.
exports.downloadDatabaseBackup = async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (databaseOperationRunning) {
    return res
      .status(409)
      .json({ error: "Another database operation is running." });
  }

  // The ZIP password is independent from the administrator's account password.
  const zipPassword = process.env.BACKUP_ZIP_PASSWORD;
  try {
    secureBackup.passwordCheck(zipPassword);
  } catch {
    return res
      .status(503)
      .json({
        error: "The server backup password is not configured correctly.",
      });
  }

  databaseOperationRunning = true;
  let temporaryDirectory;
  try {
    temporaryDirectory = await fsp.mkdtemp(
      path.join(os.tmpdir(), "lms-backup-"),
    );
    const dumpPath = path.join(temporaryDirectory, "database.dump");
    await runPostgresCommand(
      process.env.PG_DUMP_PATH || "pg_dump",
      [...getDatabaseArguments(), "--no-password", "-F", "c", "-f", dumpPath],
      getCommandOptions(),
    );

    const dumpStats = await fsp.stat(dumpPath);
    if (dumpStats.size > secureBackup.MAX) {
      throw new Error("Backup exceeds the 64 MiB limit.");
    }
    const zip = await secureBackup.pack(
      await fsp.readFile(dumpPath),
      zipPassword,
    );
    res.attachment(`backup_cdlms_${Date.now()}.zip`);
    res.type("application/zip");
    res.send(zip);
    await logDatabaseActivity(req, "Generated encrypted database backup");
  } catch (error) {
    console.error("Database backup failed:", {
      code: error.code,
      message: error.message?.split("\n")[0],
      stderr: error.stderr,
    });

    if (!res.headersSent) {
      res.status(500).json({
        error:
          "Backup failed. Check server configuration and PostgreSQL tools; no backup was generated.",
      });
    }
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
    databaseOperationRunning = false;
  }
};

// Runs before the upload is parsed, so a disabled server never buffers the file.
exports.requireRestoreEnabled = (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (process.env.ENABLE_DATABASE_RESTORE !== "true") {
    return res
      .status(503)
      .json({
        error:
          "Database restore is disabled. Enable it only during a maintenance window.",
      });
  }
  next();
};

// Reads the setting directly; the maintenance middleware's 15-second cache could be stale.
exports.requireMaintenanceMode = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT value FROM public.system_settings WHERE key = 'maintenance_mode'",
    );
    if (rows[0]?.value !== "true") {
      return res.status(409).json({
        error:
          "Turn on maintenance mode in System Settings before restoring a backup.",
      });
    }
  } catch {
    return res
      .status(503)
      .json({ error: "Could not confirm maintenance mode. Try again." });
  }
  next();
};

// lastBackupAt is the last backup download recorded in activity_log, not a stored backup.
exports.getRestoreStatus = async (req, res) => {
  res.set("Cache-Control", "no-store");
  try {
    const { rows } = await pool.query(
      `SELECT
         (SELECT value FROM public.system_settings WHERE key = 'maintenance_mode') AS maintenance_mode,
         (SELECT act_date FROM public.activity_log
           WHERE act_log = 'Generated encrypted database backup'
           ORDER BY act_date DESC LIMIT 1) AS last_backup_at`,
    );
    res.json({
      success: true,
      data: {
        restoreEnabled: process.env.ENABLE_DATABASE_RESTORE === "true",
        maintenanceMode: rows[0].maintenance_mode === "true",
        lastBackupAt: rows[0].last_backup_at,
      },
    });
  } catch {
    res.status(500).json({ error: "Could not load restore status." });
  }
};

exports.restoreDatabaseBackup = async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (databaseOperationRunning) {
    return res
      .status(409)
      .json({ error: "Another database operation is running." });
  }
  if (req.body?.confirmation !== "RESTORE DATABASE") {
    return res.status(400).json({ error: "Type RESTORE DATABASE to confirm." });
  }
  if (!req.file?.buffer) {
    return res.status(400).json({ error: "Select an encrypted backup ZIP." });
  }

  databaseOperationRunning = true;
  let temporaryDirectory;
  let restored = false;
  try {
    let dump;
    try {
      // Restore uses the ZIP password supplied by the recovery operator.
      // This also supports older archives with their original ZIP password.
      dump = await secureBackup.unpack(req.file.buffer, req.body.password);
    } catch {
      return res
        .status(400)
        .json({
          error:
            "Wrong password, wrong server key, modified archive, or unsupported backup.",
        });
    }

    temporaryDirectory = await fsp.mkdtemp(
      path.join(os.tmpdir(), "lms-restore-"),
    );
    const dumpPath = path.join(temporaryDirectory, "database.dump");
    await fsp.writeFile(dumpPath, dump, { mode: 0o600 });
    const restoreBinary = process.env.PG_RESTORE_PATH || "pg_restore";
    await runPostgresCommand(
      restoreBinary,
      ["--list", dumpPath],
      getCommandOptions(),
    );
    // Abort the restore if the live data cannot be saved first.
    const safetyDumpPath = await takeSafetyDump();
    await runPostgresCommand(
      restoreBinary,
      [
        ...getDatabaseArguments(),
        "--no-password",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--single-transaction",
        "--exit-on-error",
        dumpPath,
      ],
      getCommandOptions(),
    );
    restored = true;

    // The backup carries its own maintenance_mode and sessions; keep the system
    // closed and make everyone sign in again against the restored accounts.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO public.system_settings (key, value, updated_at)
         VALUES ('maintenance_mode', 'true', NOW())
         ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`,
      );
      await client.query('DELETE FROM public."session"');
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    clearMaintenanceCache();

    // Written after the restore, otherwise the restored activity_log would erase it.
    await logDatabaseActivity(
      req,
      `Completed database restore (backup ${req.file.size} bytes, safety dump: ${safetyDumpPath})`,
    );
    res.json({
      success: true,
      message:
        "Restore completed. Everyone has been signed out and maintenance mode is on. Sign in again.",
    });
  } catch {
    console.error("Database restore failed. Review PostgreSQL server logs.");
    await logDatabaseActivity(
      req,
      restored
        ? "Database restore failed after the data was replaced: maintenance mode and session cleanup did not finish"
        : "Database restore failed; the database was not changed",
    );
    if (!res.headersSent) {
      res.status(500).json({
        error: restored
          ? "The data was restored, but turning on maintenance mode and signing everyone out failed. Do both manually now."
          : "Restore failed. Review PostgreSQL server logs before retrying.",
      });
    }
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
    databaseOperationRunning = false;
  }
};

// @desc    Download raw server error logs (.log)
exports.downloadServerLogs = async (req, res) => {
  try {
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `server_error_${dateStr}.log`;
    const logsPath = path.join(__dirname, "..", "..", "tmp", filename);

    const tmpDir = path.dirname(logsPath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // logger.js rotates daily (error-YYYY-MM-DD.log), so pick the newest file
    const logsDir = path.join(__dirname, "..", "..", "logs");
    let realLogFound = false;

    if (fs.existsSync(logsDir)) {
      const errorLogFiles = fs
        .readdirSync(logsDir)
        .filter((f) => f.startsWith("error-") && f.endsWith(".log"))
        .sort()
        .reverse(); // newest first; YYYY-MM-DD sorts lexicographically

      if (errorLogFiles.length > 0) {
        const mostRecentLog = path.join(logsDir, errorLogFiles[0]);
        fs.copyFileSync(mostRecentLog, logsPath);
        realLogFound = true;
      }
    }

    if (!realLogFound) {
      // Local dev may run without the file logger, so send a placeholder instead of a fake trace.
      const fallbackLogContent = `[${new Date().toISOString()}] [INFO] System Log Export\nNo active server error log file was found at export time.\nThe system is currently operating normally or file-based logging is disabled in this environment.\n`;
      fs.writeFileSync(logsPath, fallbackLogContent);
    }

    res.download(logsPath, filename, (err) => {
      fs.unlink(logsPath, (unlinkErr) => {
        if (unlinkErr) console.error("Error cleaning up log file:", unlinkErr);
      });
      if (err) {
        console.error("Error sending log file:", err);
        return;
      }
      // Only log after the download actually succeeded
      require("../../utils/logger").logActivity(
        req.user.id,
        "Downloaded raw server error logs (.log)",
      );
    });
  } catch (err) {
    console.error("Logs route error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
