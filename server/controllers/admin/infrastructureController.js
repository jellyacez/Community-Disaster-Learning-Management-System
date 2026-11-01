const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const fs = require("node:fs");
const fsp = fs.promises;
const path = require("node:path");
const os = require("node:os");
const secureBackup = require("../../services/secureBackup");

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

exports.restoreDatabaseBackup = async (req, res) => {
  res.set("Cache-Control", "no-store");
  if (process.env.ENABLE_DATABASE_RESTORE !== "true") {
    return res
      .status(503)
      .json({
        error:
          "Database restore is disabled. Enable it only during a maintenance window.",
      });
  }
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
    await logDatabaseActivity(req, "Started database restore");
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
    res.json({
      success: true,
      message: "Restore completed. Sign in again and refresh application data.",
    });
  } catch {
    console.error("Database restore failed. Review PostgreSQL server logs.");
    if (!res.headersSent) {
      res
        .status(500)
        .json({
          error:
            "Restore failed. Review PostgreSQL server logs before retrying.",
        });
    }
  } finally {
    await removeTemporaryDirectory(temporaryDirectory);
    databaseOperationRunning = false;
  }
};

// @desc    Download raw server error logs (.log)
// @access  Private (system_admin only)
exports.downloadServerLogs = async (req, res) => {
  try {
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `server_error_${dateStr}.log`;
    const logsPath = path.join(__dirname, "..", "..", "tmp", filename);

    // Ensure tmp directory exists
    const tmpDir = path.dirname(logsPath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Scan the logs/ directory for the most recent daily-rotating error log file
    // (logger.js produces files named error-YYYY-MM-DD.log, not a fixed error.log)
    const logsDir = path.join(__dirname, "..", "..", "logs");
    let realLogFound = false;

    if (fs.existsSync(logsDir)) {
      const errorLogFiles = fs
        .readdirSync(logsDir)
        .filter((f) => f.startsWith("error-") && f.endsWith(".log"))
        .sort()
        .reverse(); // most recent date first (lexicographic sort works for YYYY-MM-DD)

      if (errorLogFiles.length > 0) {
        const mostRecentLog = path.join(logsDir, errorLogFiles[0]);
        fs.copyFileSync(mostRecentLog, logsPath);
        realLogFound = true;
      }
    }

    if (!realLogFound) {
      // If no real logs exist (e.g., local dev environment without a file logger),
      // provide a clean fallback message instead of a fake error trace.
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
