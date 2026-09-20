const pool = require("../../config/db");
const { UNSCOPED_ACCESS_ROLES } = require("../../config/permissions");

// @desc    Get paginated announcements with separated annual advisory numbering (Urgent & Standard)
// @access  Private
exports.getPaginatedAnnouncements = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    const isUnscoped =
      req.user && UNSCOPED_ACCESS_ROLES.includes(req.user.role);
    const barangayId = req.user?.barangay_id || null;

    let countQuery;
    let announcementsQuery;

    if (isUnscoped) {
      countQuery = await pool.query("SELECT COUNT(*) FROM announcements");
      announcementsQuery = await pool.query(
        `
        WITH numbered_announcements AS (
          SELECT 
            a.id, 
            a.title, 
            a.content, 
            a.priority,
            a.date, 
            a.barangay_id,
            u.name AS author_name,
            /* Independent sequence for urgent vs standard resetting each calendar year */
            ROW_NUMBER() OVER (
              PARTITION BY a.priority, EXTRACT(YEAR FROM a.date) 
              ORDER BY a.date ASC, a.id ASC
            ) AS advisory_number
          FROM announcements a
          JOIN "user" u ON a.author_id = u.id
        )
        SELECT *
        FROM numbered_announcements
        ORDER BY 
          /* Urgent announcements take first slots (0 before 1), ordered sequentially */
          CASE WHEN priority = 'urgent' THEN 0 ELSE 1 END ASC,
          advisory_number ASC
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
        WITH numbered_announcements AS (
          SELECT 
            a.id, 
            a.title, 
            a.content, 
            a.priority,
            a.date, 
            a.barangay_id,
            u.name AS author_name,
            ROW_NUMBER() OVER (
              PARTITION BY a.priority, EXTRACT(YEAR FROM a.date) 
              ORDER BY a.date ASC, a.id ASC
            ) AS advisory_number
          FROM announcements a
          JOIN "user" u ON a.author_id = u.id
          WHERE a.barangay_id = $1 OR a.barangay_id IS NULL
        )
        SELECT *
        FROM numbered_announcements
        ORDER BY 
          CASE WHEN priority = 'urgent' THEN 0 ELSE 1 END ASC,
          advisory_number ASC
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
        WITH numbered_announcements AS (
          SELECT 
            a.id, 
            a.title, 
            a.content, 
            a.priority,
            a.date, 
            a.barangay_id,
            u.name AS author_name,
            ROW_NUMBER() OVER (
              PARTITION BY a.priority, EXTRACT(YEAR FROM a.date) 
              ORDER BY a.date ASC, a.id ASC
            ) AS advisory_number
          FROM announcements a
          JOIN "user" u ON a.author_id = u.id
          WHERE a.barangay_id IS NULL
        )
        SELECT *
        FROM numbered_announcements
        ORDER BY 
          CASE WHEN priority = 'urgent' THEN 0 ELSE 1 END ASC,
          advisory_number ASC
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );
    }

    const total = parseInt(countQuery.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const announcements = announcementsQuery.rows.map((a) => {
      const dateObj = new Date(a.date);
      return {
        id: a.id,
        advisory_number: parseInt(a.advisory_number, 10),
        title: a.title,
        content: a.content,
        priority: a.priority || "standard",
        barangay_id: a.barangay_id,
        created_at: a.date, // Preserves raw timestamp for 48h recency calculations
        date: dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
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
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch announcements." });
  }
};