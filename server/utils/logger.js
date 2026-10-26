const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const LOGS_DIR = path.join(__dirname, '../logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

const getDailyLogPath = (prefix) => {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOGS_DIR, `${prefix}-${date}.log`);
};

const writeToDisk = (prefix, line) => {
  try {
    fs.appendFileSync(getDailyLogPath(prefix), line);
  } catch (fsErr) {
    console.error('[Logger] Failed to write log to disk:', fsErr.message);
  }
};

/**
 * Centralized activity logger utility.
 * Extracts client IP safely from Express req or Better Auth ctx headers.
 */

exports.logActivity = async (userId, action, context = null, clientIp = null) => {
  if (!userId || !action) return;

  let normalizedIp = clientIp;

  if (!normalizedIp && context) {
    const headers = context.headers || context.request?.headers;

    normalizedIp =
      context.ip ||
      context.socket?.remoteAddress ||
      context.request?.ip ||
      context.request?.socket?.remoteAddress ||
      (typeof headers?.get === "function"
        ? headers.get("x-forwarded-for") || headers.get("x-real-ip")
        : headers?.["x-forwarded-for"] || headers?.["x-real-ip"]) ||
      null;
  }

  if (normalizedIp) {
    normalizedIp = String(normalizedIp).split(",")[0].trim();

    if (normalizedIp === "::1" || normalizedIp === "::ffff:127.0.0.1") {
      normalizedIp = "127.0.0.1";
    }
  }

  try {
    await pool.query(
      `INSERT INTO activity_log (user_id, act_date, act_log, ip_address)
       VALUES ($1, NOW(), $2, $3)`,
      [userId, action, normalizedIp]
    );
  } catch (err) {
    console.error(
      "[ActivityLogger Error] Failed to record activity log:",
      err.message
    );
  }
};

exports.logError = (event, context = {}) => {
  const logEntry = { event, timestamp: new Date().toISOString(), ...context };
  const line = JSON.stringify(logEntry) + '\n';
  console.error(line.trimEnd());
  writeToDisk('error', line);
};

exports.logInfo = (event, context = {}) => {
  const logEntry = { event, timestamp: new Date().toISOString(), ...context };
  const line = JSON.stringify(logEntry) + '\n';
  console.info(line.trimEnd());
  writeToDisk('info', line);
};