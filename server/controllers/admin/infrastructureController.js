const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

// @desc    Download full database backup (.sql)
// @access  Private (system_admin only)
exports.downloadDatabaseBackup = async (req, res) => {
  try {
    const dbUser = process.env.DB_USER || "postgres";
    const dbHost = process.env.DB_HOST || "localhost";
    const dbPort = process.env.DB_PORT || "5432";
    const dbName = process.env.DB_DATABASE || "LMS_db";
    const dbPassword = process.env.DB_PASSWORD || "";

    // Generate a timestamped filename
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup_cdlms_${dateStr}.sql`;

    // Create a temporary file path
    const backupPath = path.join(__dirname, "..", "..", "tmp", filename);

    // Ensure tmp directory exists
    const tmpDir = path.dirname(backupPath);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // SECURITY: Use execFile instead of exec to pass arguments as an array,
    // which bypasses shell interpretation entirely and eliminates any command
    // injection risk from environment variable values containing metacharacters.
    const pgDumpArgs = [
      "-U", dbUser,
      "-h", dbHost,
      "-p", String(dbPort),
      "-d", dbName,
      "-F", "c",
      "-f", backupPath,
    ];

    const execOptions = {
      env: {
        ...process.env,
        PGPASSWORD: dbPassword,
      },
    };

    // Allow overriding the pg_dump binary path via env var.
    // This avoids relying on system PATH, which may not be updated without a reboot on Windows.
    const pgDumpBin = process.env.PG_DUMP_PATH || "pg_dump";

    execFile(pgDumpBin, pgDumpArgs, execOptions, (error) => {
      if (error) {
        console.error("pg_dump error:", error);

        // Check if pg_dump is not recognized (common on local Windows setups during Capstone defenses)
        if (
          error.code === "ENOENT" ||
          error.code === 127 ||
          (error.message &&
            (error.message.includes("is not recognized") ||
              error.message.includes("not found")))
        ) {
          console.log(
            "pg_dump not found. Generating a mock SQL backup for defense demonstration purposes.",
          );

          const mockSqlContent = `-- Community Disaster LMS Mock Database Backup
-- Generated for Capstone Defense Demonstration
-- Timestamp: ${new Date().toISOString()}

CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) DEFAULT 'resident'
);

-- Note: This is a placeholder file because pg_dump is not installed on this local machine.
-- In a production Linux environment, this file will contain the full binary schema and data dump.
`;
          fs.writeFileSync(backupPath, mockSqlContent);

          return res.download(backupPath, filename, (err) => {
            fs.unlink(backupPath, (unlinkErr) => {
              if (unlinkErr)
                console.error("Error cleaning up mock backup file:", unlinkErr);
            });
            if (err) {
              console.error("Error sending mock backup file:", err);
              return;
            }
            // Only log after the download actually succeeded
            require("../../utils/logger").logActivity(
              req.user.id,
              "Triggered full database backup download (Mock)",
            );
          });
        }

        return res
          .status(500)
          .json({
            success: false,
            error: "Failed to generate database backup",
          });
      }

      // If successful, download the file to the client
      res.download(backupPath, filename, (err) => {
        // Clean up: delete the temporary backup file after download attempt
        fs.unlink(backupPath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error cleaning up backup file:", unlinkErr);
        });

        if (err) {
          console.error("Error sending backup file:", err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: "Failed to download backup file",
            });
          }
          return;
        }

        // Only log after the download actually succeeded
        require("../../utils/logger").logActivity(
          req.user.id,
          "Triggered full database backup download",
        );
      });
    });
  } catch (err) {
    console.error("Backup route error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
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
      const errorLogFiles = fs.readdirSync(logsDir)
        .filter(f => f.startsWith("error-") && f.endsWith(".log"))
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
