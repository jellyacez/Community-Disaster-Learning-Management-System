const pool = require("../../config/db");
const sseService = require("./sseService");

/**
 * Stores an in-app notification (shown in the bell) and pushes USER_NOTIFICATION
 * so an open bell refreshes. Never throws: a notification must not fail the action.
 */
const notifyUser = async (userId, type, message) => {
  if (!userId) return;
  try {
    await pool.query(
      `INSERT INTO public.user_notification (user_id, type, message) VALUES ($1, $2, $3)`,
      [userId, type, message]
    );
    sseService.broadcastWhere((client) => client.userId === userId, "USER_NOTIFICATION", {});
  } catch (err) {
    console.error(`In-app notification (${type}) failed:`, err.message);
  }
};

module.exports = { notifyUser };
