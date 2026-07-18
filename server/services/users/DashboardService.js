const pool = require("../../config/db");

class DashboardService {
  async getDashboardData(userId) {
    const modulesCountQuery = await pool.query(
      "SELECT COUNT(*) FROM module_data",
    );
    const totalModules = parseInt(modulesCountQuery.rows[0].count, 10);
    const announcementsQuery = await pool.query(`
      SELECT a.id, a.title, a.content, a.date, u.name as author_name
      FROM announcements a
      JOIN "user" u ON a.author_id = u.id
      ORDER BY a.date DESC
      LIMIT 3
    `);

    const announcements = announcementsQuery.rows.map((a) => {
      const date = new Date(a.date);
      return {
        id: a.id,
        title: a.title,
        content: a.content,
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        author: a.author_name,
      };
    });

    const enrolledModulesQuery = await pool.query(
      `
      SELECT 
        md.mod_id as id, 
        md.modname as title, 
        md.modcat as category, 
        md.level, 
        md.duration, 
        md.description,
        ma.modstatus as status,
        COALESCE(ma.progress, 0) as progress 
      FROM module_activity ma
      JOIN module_data md ON ma.mod_id = md.mod_id
      WHERE ma.user_id = $1
      ORDER BY ma.progress DESC, ma.started_at DESC
    `,
      [userId],
    );

    const enrolledModules = enrolledModulesQuery.rows;

    let completionRate = 0;
    if (enrolledModules.length > 0) {
      const totalProgress = enrolledModules.reduce(
        (sum, mod) => sum + mod.progress,
        0,
      );
      completionRate = Math.round(totalProgress / enrolledModules.length);
    }

    return {
      totalModules,
      announcements,
      enrolledModules,
      completionRate,
    };
  }
}

module.exports = new DashboardService();
