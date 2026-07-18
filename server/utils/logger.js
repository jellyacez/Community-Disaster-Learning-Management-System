const pool = require('../config/db');

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
 * Structured error logger designed for non-DB dependent logging,
 * primarily for authentication or system-level middleware failures.
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
  // Unconditionally log to console.error in a structured format
  console.error(JSON.stringify(logEntry));
};
