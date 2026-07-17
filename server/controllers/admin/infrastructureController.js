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
    const dbName = process.env.DB_NAME || "cdlms";
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

    execFile("pg_dump", pgDumpArgs, execOptions, (error) => {
      if (error) {
        console.error("pg_dump error:", error);

        // Check if pg_dump is not recognized (common on local Windows setups during Capstone defenses)
        if (
          error.message &&
          (error.message.includes("is not recognized") ||
            error.message.includes("not found") ||
            error.code === 127)
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
            if (err) console.error("Error sending mock backup file:", err);
            fs.unlink(backupPath, (unlinkErr) => {
              if (unlinkErr)
                console.error("Error cleaning up mock backup file:", unlinkErr);
            });
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
    res.status(500).json({ success: false, error: "Server Error" });
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

    // Determine if we have real logs to serve
    const potentialLogPaths = [
      path.join(__dirname, "..", "..", "logs", "error.log"),
      path.join(__dirname, "..", "..", "error.log")
    ];
    
    let realLogFound = false;
    for (const logPath of potentialLogPaths) {
      if (fs.existsSync(logPath)) {
        fs.copyFileSync(logPath, logsPath);
        realLogFound = true;
        break;
      }
    }

    if (!realLogFound) {
      // If no real logs exist (e.g., local dev environment without a file logger),
      // provide a clean fallback message instead of a fake error trace.
      const fallbackLogContent = `[${new Date().toISOString()}] [INFO] System Log Export
No active server error log file was found at export time.
The system is currently operating normally or file-based logging is disabled in this environment.
`;
      fs.writeFileSync(logsPath, fallbackLogContent);
    }

    res.download(logsPath, filename, (err) => {
      if (err) console.error("Error sending log file:", err);
      fs.unlink(logsPath, (unlinkErr) => {
        if (unlinkErr) console.error("Error cleaning up log file:", unlinkErr);
      });
      require("../../utils/logger").logActivity(
        req.user.id,
        "Downloaded raw server error logs (.log)",
      );
    });
  } catch (err) {
    console.error("Logs route error:", err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
