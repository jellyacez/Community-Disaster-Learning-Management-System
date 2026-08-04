const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const LOGS_DIR = path.join(__dirname, '../logs');

// Ensure logs directory exists on startup
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Returns the path for a daily rotating log file.
 * Files are named error-YYYY-MM-DD.log and info-YYYY-MM-DD.log.
 * The log retention cron in logRetention.js will clean these up after 90 days.
 */
const getDailyLogPath = (prefix) => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(LOGS_DIR, `${prefix}-${date}.log`);
};

/**
 * Write a JSON log line to disk synchronously.
 * Sync writes are intentional here — logs must be in order and we don't want
 * an async callback queue backing up under error-storm conditions.
 * The risk of brief event-loop stall on a single appendFileSync is acceptable
 * for a low-volume logger.
 */
const writeToDisk = (prefix, line) => {
  try {
    fs.appendFileSync(getDailyLogPath(prefix), line);
  } catch (fsErr) {
    // Last-resort: if we can't write to disk, at least don't crash the app
    console.error('[Logger] Failed to write log to disk:', fsErr.message);
  }
};

/**
 * Centralized activity logger utility.
 * Designed to be highly robust and non-blocking. If a database insert fails,
 * it catches the error and logs it to the console, ensuring the main application
 * request (e.g., login, user provisioning) is never crashed by a logging failure.
 * 
 * @param {string|number} userId - The ID of the user performing the action.
 * @param {string} action - A brief description of the action (e.g., 'Logged in successfully').
 */
exports.logActivity = async (userId, action) => {
  if (!userId || !action) return;
  
  try {
    // Fire-and-forget: we await it here so we can catch any DB errors,
    // but the caller does not need to await logActivity().
    await pool.query(
      `INSERT INTO activity_log (user_id, act_date, act_log) VALUES ($1, NOW(), $2)`,
      [userId, action]
    );
  } catch (err) {
    // Swallowing the error to prevent application crashes
    console.error(`[ActivityLogger Error] Failed to log action '${action}' for user ${userId}:`, err.message);
  }
};

/**
 * Structured error logger. Writes to console.error AND appends a JSON line
 * to a daily rotating file in server/logs/error-YYYY-MM-DD.log.
 * 
 * @param {string} event - The type of event (e.g., 'auth_middleware_failure').
 * @param {object} context - Additional context (route, method, message, timestamp, etc.).
 */
exports.logError = (event, context = {}) => {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    ...context
  };
  const line = JSON.stringify(logEntry) + '\n';
  console.error(line.trimEnd());
  writeToDisk('error', line);
};

/**
 * Structured info logger. Writes to console.info AND appends a JSON line
 * to a daily rotating file in server/logs/info-YYYY-MM-DD.log.
 * 
 * @param {string} event - The type of event (e.g., 'certificate_expiry_cron_success').
 * @param {object} context - Additional context.
 */
exports.logInfo = (event, context = {}) => {
  const logEntry = {
    event,
    timestamp: new Date().toISOString(),
    ...context
  };
  const line = JSON.stringify(logEntry) + '\n';
  console.info(line.trimEnd());
  writeToDisk('info', line);
};
