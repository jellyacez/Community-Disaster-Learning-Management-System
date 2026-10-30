const pool = require("../../config/db");
const { UNSCOPED_ACCESS_ROLES } = require("../../config/permissions");

// An urgent advisory stays pinned only while it is in effect (not expired, not lifted)
const inEffectSql = (t) =>
  `(${t}.priority = 'urgent' AND ${t}.lifted_at IS NULL AND (${t}.expires_at IS NULL OR ${t}.expires_at > NOW()))`;

// @desc    Get paginated announcements: in-effect urgent advisories first, then newest first
// @access  Private
exports.getPaginatedAnnouncements = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;
    const offset = (page - 1) * limit;

    const isUnscoped =
      req.user && UNSCOPED_ACCESS_ROLES.includes(req.user.role);
    const barangayId = req.user?.barangay_id || null;

    // Residents see their barangay's posts plus municipality-wide ones
    const conditions = [];
    const scopeParams = [];
    if (!isUnscoped) {
      if (barangayId) {
        scopeParams.push(barangayId);
        conditions.push("(n.barangay_id = $1 OR n.barangay_id IS NULL)");
      } else {
        conditions.push("n.barangay_id IS NULL");
      }
    }
    // status=active: only urgent advisories in effect (the page's top section);
    // status=history: everything else (the paginated list below it)
    if (req.query.status === "active") conditions.push(inEffectSql("n"));
    if (req.query.status === "history") conditions.push(`NOT ${inEffectSql("n")}`);
    const scopeSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = await pool.query(
      `SELECT COUNT(*) FROM announcements n ${scopeSql}`,
      scopeParams
    );

    // Numbers are assigned across every announcement before the viewer's scope is applied,
    // so an advisory keeps one number (unique within its year) whoever is reading it
    const announcementsQuery = await pool.query(
      `
      WITH numbered AS (
        SELECT
          a.id,
          a.title,
          a.content,
          a.priority,
          a.date,
          a.barangay_id,
          a.expires_at,
          a.lifted_at,
          ${inEffectSql("a")} AS in_effect,
          EXTRACT(YEAR FROM a.date)::int AS advisory_year,
          ROW_NUMBER() OVER (
            PARTITION BY EXTRACT(YEAR FROM a.date)
            ORDER BY a.date ASC, a.id ASC
          ) AS advisory_number,
          -- Who issued it, so residents can judge the source; MDRRMO can also target one barangay
          CASE
            WHEN u.role IS NULL THEN NULL
            WHEN u.role = 'barangay_admin' AND b.name IS NOT NULL THEN
              CASE WHEN b.name ILIKE 'barangay%' THEN b.name ELSE 'Barangay ' || b.name END
            ELSE 'MDRRMO Bacolor'
          END AS issuer
        FROM announcements a
        LEFT JOIN "user" u ON a.author_id = u.id
        LEFT JOIN barangays b ON a.barangay_id = b.id
      )
      SELECT *
      FROM numbered n
      ${scopeSql}
      ORDER BY n.in_effect DESC, n.date DESC, n.id DESC
      LIMIT $${scopeParams.length + 1} OFFSET $${scopeParams.length + 2}
      `,
      [...scopeParams, limit, offset]
    );

    const total = parseInt(countQuery.rows[0].count, 10);
    const totalPages = Math.ceil(total / limit);

    const announcements = announcementsQuery.rows.map((a) => {
      const dateObj = new Date(a.date);
      return {
        id: a.id,
        advisory_number: parseInt(a.advisory_number, 10),
        advisory_year: a.advisory_year,
        title: a.title,
        content: a.content,
        priority: a.priority || "standard",
        barangay_id: a.barangay_id,
        in_effect: a.in_effect,
        issuer: a.issuer,
        expires_at: a.expires_at,
        lifted_at: a.lifted_at,
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
