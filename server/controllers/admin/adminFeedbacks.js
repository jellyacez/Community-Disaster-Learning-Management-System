const pool = require("../../config/db");

// @desc    Get scoped feedback submissions for admins
// @route   GET /api/admin/mdrrmo/feedback
exports.getAdminFeedbacks = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.session?.user?.role;
    const adminBarangayId = req.user?.barangay_id || req.session?.user?.barangay_id;

    if (!adminRole) {
      return res.status(401).json({ success: false, error: "Unauthorized. Missing user context." });
    }

    const isMdrrmoOrSystem =
      adminRole.includes("mdrrmo") || adminRole === "system_admin";

    let query = `
      SELECT
        f.*,
        u.name AS resident_name,
        u.barangay_id,
        b.name AS barangay_name
      FROM public.feedbacks f
      INNER JOIN public."user" u ON f.user_id = u.id
      LEFT JOIN public.barangays b ON u.barangay_id = b.id
    `;

    const queryParams = [];
    const conditions = [];

    // 1. MDRRMO / System Admin Scoping
    if (isMdrrmoOrSystem) {
      if (req.query.barangay_id && req.query.barangay_id !== "all") {
        queryParams.push(parseInt(req.query.barangay_id, 10));
        conditions.push(`u.barangay_id = $${queryParams.length}`);
      }

      if (req.query.office && req.query.office !== "all") {
        queryParams.push(req.query.office);
        conditions.push(`f.recipient = $${queryParams.length}`);
      }
    }
    // 2. Barangay Admin Scoping
    else if (adminRole === "barangay_admin") {
      if (!adminBarangayId) {
        return res.status(403).json({
          success: false,
          error: "Forbidden. Admin account is not assigned to a barangay.",
        });
      }

      queryParams.push(adminBarangayId);
      conditions.push(`u.barangay_id = $${queryParams.length}`);
      conditions.push(`f.recipient = 'barangay'`);
    } else {
      return res.status(403).json({ success: false, error: "Forbidden. Insufficient permissions." });
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY f.created_at DESC;`;

    const { rows } = await pool.query(query, queryParams);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to load department communications." });
  }
};

// @desc    Reply to a feedback submission and update status
// @route   PUT /api/admin/mdrrmo/feedback/:id/reply
exports.replyToFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply, status } = req.body;
    const adminId = req.user?.id || req.session?.user?.id;

    if (!reply || !status) {
      return res.status(400).json({ success: false, error: "Reply text and status are required." });
    }

    const query = `
      UPDATE public.feedbacks
      SET reply = $1, status = $2, replied_by = $3, replied_at = NOW()
      WHERE feedback_id = $4
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [reply, status, adminId, id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Feedback record not found." });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to submit response." });
  }
};
