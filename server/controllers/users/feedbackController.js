const feedbackService = require("../../services/feedback/FeedbackService");

// @desc    Get logged-in resident's feedback history
// @route   GET /api/feedbacks/my-submissions
exports.getFeedbacks = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const rows = await feedbackService.getUserFeedbacks(userId);
    res.json({ success: true, data: rows });
  } catch (_) {
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

    const row = await feedbackService.submitFeedback(userId, req.body);
    res.status(201).json({ success: true, data: row });
  } catch (_) {
    res.status(500).json({ success: false, error: "Failed to submit feedback." });
  }
};

// @desc    Reply to an existing feedback ticket
// @route   PUT /api/feedbacks/:id/reply
exports.userReplyToFeedback = async (req, res) => {
  try {
    const userId = req.user?.id || req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized." });
    }

    const { id } = req.params;
    const { reply } = req.body;

    if (!reply) {
      return res.status(400).json({ success: false, error: "Reply text is required." });
    }

    const row = await feedbackService.userReplyToFeedback(userId, id, reply);
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: "Failed to post reply." });
  }
};
