const pool = require("../../config/db");

class DashboardService {
  async getDashboardData(userId) {
    const userQuery = await pool.query(
      `SELECT u.name, u.email, u.role, b.name as barangay_name 
       FROM "user" u 
       LEFT JOIN barangays b ON u.barangay_id = b.id 
       WHERE u.id = $1`,
      [userId]
    );
    const userDetails = userQuery.rows[0];

    const modulesCountQuery = await pool.query(
      "SELECT COUNT(*) FROM module_data WHERE status = 'published'",
    );
    const totalModules = parseInt(modulesCountQuery.rows[0].count, 10);

    const categoryCountsQuery = await pool.query(
      `SELECT LOWER(modcat) as category, COUNT(*)::int as total
       FROM module_data
       WHERE status = 'published'
       GROUP BY LOWER(modcat)`
    );
    const categoryTotals = categoryCountsQuery.rows.reduce((acc, row) => {
      acc[row.category] = row.total;
      return acc;
    }, {});

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
        ma.modstatus as enrollment_status,
        COALESCE(ma.progress, 0) as progress,
        (
          SELECT ms.step_title
          FROM module_steps ms
          JOIN levels l ON ms.level_id = l.level_id
          WHERE l.mod_id = md.mod_id
            AND NOT EXISTS (
              SELECT 1 
              FROM user_step_progress usp 
              WHERE usp.user_id = $1 
                AND usp.step_id = ms.step_id
            )
          ORDER BY l.level_order ASC, ms.step_order ASC
          LIMIT 1
        ) as "nextStepTitle"
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

    const certificatesQuery = await pool.query(
      `SELECT c.cert_rec, c.verification_token, c.completion_date, c.expires_at, c.module_id, m.modname as module_title,
        CASE 
          WHEN c.status = 'revoked' THEN 'revoked'
          WHEN c.expires_at < NOW() THEN 'expired'
          ELSE c.status 
        END as status
       FROM certificates c
       JOIN module_data m ON c.module_id = m.mod_id
       WHERE c.user_id = $1`,
      [userId]
    );
    const certificates = certificatesQuery.rows;

    return {
      totalModules,
      categoryTotals,
      announcements,
      enrolledModules,
      completionRate,
      certificates,
      userDetails,
    };
  }
}

module.exports = new DashboardService();
