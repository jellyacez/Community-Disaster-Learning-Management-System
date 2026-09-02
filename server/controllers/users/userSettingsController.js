const pool = require("../../config/db"); // or "../config/db" depending on folder depth
// 
 exports.getUserSessions = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { rows } = await pool.query(
      `SELECT 
         id, 
         "ipAddress" AS ip_address, 
         "userAgent" AS user_agent, 
         "createdAt" AS created_at, 
         "updatedAt" AS updated_at
       FROM public."session"
       WHERE "userId" = $1
       ORDER BY "updatedAt" DESC
       LIMIT 5`,
      [userId]
    );

    return res.status(200).json({ sessions: rows });
  } catch (error) {
    console.error("Error fetching user sessions:", error);
    return res.status(500).json({ message: "Failed to load active sessions." });
  }
};