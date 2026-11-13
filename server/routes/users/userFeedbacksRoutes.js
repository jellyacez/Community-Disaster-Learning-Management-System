const express = require("express");
const router = express.Router();
const feedbackController = require("../../controllers/users/feedbackController");
const { authenticate } = require("../../middleware/authenticate");

// @route   GET /api/feedbacks/my-submissions
router.get("/my-submissions", authenticate, feedbackController.getFeedbacks);

// @route   POST /api/feedbacks
router.post("/", authenticate, feedbackController.submitFeedback);

// @route   PUT /api/feedbacks/:id/reply
router.put("/:id/reply", authenticate, feedbackController.userReplyToFeedback);

module.exports = router;
