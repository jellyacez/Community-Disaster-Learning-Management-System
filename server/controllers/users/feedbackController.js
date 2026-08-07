const pool = require("../../config/db");

// @desc    Get logged-in resident's feedback history
// @route   GET /api/feedbacks/my-submissions
exports.getFeedbacks = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const query = `
      SELECT * FROM public.feedbacks
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch feedback history." });
  }
};

// @desc    Submit new feedback, inquiry, concern, or report
// @route   POST /api/feedbacks
exports.submitFeedback = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const { recipient, type, subject, message } = req.body;
    const query = `
      INSERT INTO public.feedbacks (user_id, recipient, type, subject, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      userId,
      recipient,
      type,
      subject,
      message,
    ]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to submit feedback." });
  }
};
