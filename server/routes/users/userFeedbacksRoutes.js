const express = require("express");
const router = express.Router();
const feedbackController = require("../../controllers/users/feedbackController");
const { authenticate } = require("../../middleware/authenticate");

// @route   GET /api/feedbacks/my-submissions
// @desc    Get logged-in user's feedback submissions
// @access  Private
router.get("/my-submissions", authenticate, feedbackController.getFeedbacks);

// @route   POST /api/feedbacks
// @desc    Submit new feedback/report/inquiry
// @access  Private
router.post("/", authenticate, feedbackController.submitFeedback);

// @route   PUT /api/feedbacks/:id/reply
// @desc    Reply to an existing feedback ticket
// @access  Private
router.put("/:id/reply", authenticate, feedbackController.userReplyToFeedback);

module.exports = router;
