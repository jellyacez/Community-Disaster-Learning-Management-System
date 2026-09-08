const pool = require("../../config/db");
const { UNSCOPED_ACCESS_ROLES } = require("../../config/permissions");

// @desc    Get paginated announcements
// @access  Private
exports.getPaginatedAnnouncements = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    const isUnscoped = req.user && UNSCOPED_ACCESS_ROLES.includes(req.user.role);
    const barangayId = req.user?.barangay_id || null;

    let countQuery;
    let announcementsQuery;

    if (isUnscoped) {
      countQuery = await pool.query("SELECT COUNT(*) FROM announcements");
      announcementsQuery = await pool.query(
        `
        SELECT a.id, a.title, a.content, a.date, u.name as author_name
        FROM announcements a
        JOIN "user" u ON a.author_id = u.id
        ORDER BY a.date DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );
    } else if (barangayId) {
      countQuery = await pool.query(
        "SELECT COUNT(*) FROM announcements WHERE barangay_id = $1 OR barangay_id IS NULL",
        [barangayId]
      );
      announcementsQuery = await pool.query(
        `
        SELECT a.id, a.title, a.content, a.date, u.name as author_name
        FROM announcements a
        JOIN "user" u ON a.author_id = u.id
        WHERE a.barangay_id = $1 OR a.barangay_id IS NULL
        ORDER BY a.date DESC
        LIMIT $2 OFFSET $3
        `,
        [barangayId, limit, offset]
      );
    } else {
      countQuery = await pool.query(
        "SELECT COUNT(*) FROM announcements WHERE barangay_id IS NULL"
      );
      announcementsQuery = await pool.query(
        `
        SELECT a.id, a.title, a.content, a.date, u.name as author_name
        FROM announcements a
        JOIN "user" u ON a.author_id = u.id
        WHERE a.barangay_id IS NULL
        ORDER BY a.date DESC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );
    }

    const total = parseInt(countQuery.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    // Format dates to look nice on the frontend
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

    res.json({
      announcements,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching paginated announcements:", error);
    res.status(500).json({ success: false, message: "Failed to fetch announcements." });
  }
};

