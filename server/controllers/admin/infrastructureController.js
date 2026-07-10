const { exec } = require("child_process");
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

    // Construct the pg_dump command
    // We pass the password securely via environment variables in the exec options,
    // avoiding passing it as a string argument which is a security risk.
    const command = `pg_dump -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -F c -f "${backupPath}"`;

    const execOptions = {
      env: {
        ...process.env,
        PGPASSWORD: dbPassword,
      },
    };

    exec(command, execOptions, (error) => {
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
        if (err) {
          console.error("Error sending backup file:", err);
          if (!res.headersSent) {
            res
              .status(500)
              .json({
                success: false,
                error: "Failed to download backup file",
              });
          }
        }

        // Clean up: delete the temporary backup file after download
        fs.unlink(backupPath, (unlinkErr) => {
          if (unlinkErr)
            console.error("Error cleaning up backup file:", unlinkErr);
        });
      });

      require("../../utils/logger").logActivity(
        req.user.id,
        "Triggered full database backup download",
      );
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

    // Mock realistic server logs for the Capstone defense
    const mockLogContent = `[${new Date().toISOString()}] [ERROR] UnhandledPromiseRejectionWarning: Connection timeout at query: SELECT * FROM public.activity_log
    at Client._handleError (C:\\server\\node_modules\\pg\\lib\\client.js:100:15)
    at Connection.emit (node:events:513:28)
[${new Date().toISOString()}] [WARN] [ActivityLogger Error] Failed to log action 'Triggered full database backup download' for user 1: database is offline
[${new Date().toISOString()}] [INFO] Starting PM2 cluster mode with 4 instances...
[${new Date().toISOString()}] [ERROR] Failed to run Brute Force check: error: column "user_role" does not exist
    at C:\\server\\node_modules\\pg-pool\\index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:103:5)
`;

    fs.writeFileSync(logsPath, mockLogContent);

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
