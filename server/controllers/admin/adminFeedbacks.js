const feedbackService = require("../../services/feedback/FeedbackService");

// @desc    Get scoped feedback submissions for admins
// @route   GET /api/admin/mdrrmo/feedback
exports.getAdminFeedbacks = async (req, res) => {
  try {
    const adminRole = req.user?.role || req.session?.user?.role;
    const adminBarangayId = req.user?.barangay_id || req.session?.user?.barangay_id;

    if (!adminRole) {
      return res.status(401).json({ success: false, error: "Unauthorized. Missing user context." });
    }

    const adminContext = {
      role: adminRole,
      barangay_id: adminBarangayId,
    };

    const rows = await feedbackService.getAdminFeedbacks(adminContext, req.query);
    res.json({ success: true, data: rows });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
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
    const adminRole = req.user?.role || req.session?.user?.role;
    const adminBarangayId = req.user?.barangay_id || req.session?.user?.barangay_id;

    if (!adminRole) {
      return res.status(401).json({ success: false, error: "Unauthorized. Missing user context." });
    }

    if (!reply || !status) {
      return res.status(400).json({ success: false, error: "Reply text and status are required." });
    }

    const adminContext = {
      id: adminId,
      role: adminRole,
      barangay_id: adminBarangayId,
    };

    const updatedTicket = await feedbackService.replyToFeedback(adminContext, id, { reply, status });
    res.json({ success: true, data: updatedTicket });
  } catch (err) {
    console.error("Reply error:", err);
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: "Failed to submit reply." });
  }
};

// @desc    Close a feedback ticket
// @route   PUT /api/admin/mdrrmo/feedback/:id/close
exports.closeFeedbackThread = async (req, res) => {
  try {
    const { id } = req.params;
    const adminRole = req.user?.role || req.session?.user?.role;
    const adminBarangayId = req.user?.barangay_id || req.session?.user?.barangay_id;

    if (!adminRole) {
      return res.status(401).json({ success: false, error: "Unauthorized. Missing user context." });
    }

    const adminContext = {
      role: adminRole,
      barangay_id: adminBarangayId,
    };

    const updatedTicket = await feedbackService.closeFeedbackThread(adminContext, id);
    res.json({ success: true, data: updatedTicket });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: "Failed to close feedback thread." });
  }
};
