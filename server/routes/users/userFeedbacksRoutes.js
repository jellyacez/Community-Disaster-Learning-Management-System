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

module.exports = router;
