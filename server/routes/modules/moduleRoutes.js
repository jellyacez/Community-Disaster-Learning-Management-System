const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authenticate");

// Apply authentication to all routes
router.use(authenticate);
// modules
const moduleController = require("../../controllers/modules/moduleController");
const moduleProgressController = require("../../controllers/modules/moduleProgressController");
const quizAttemptController = require("../../controllers/modules/quizAttemptController");

//middlewares
const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES, MODULE_VIEWER_ROLES } = require("../../config/permissions");


const requirePermission = require("../../middleware/requirePermission");
const uploadMiddleware = require("../../middleware/uploadMiddleware");

// @route   POST /api/modules
// @desc    Create a new training module
// @access  Private (admin only)
router.post("/", requireRole(ADMIN_ROLES), requirePermission('manage_modules'), moduleController.createModule);

// @route   POST /api/modules/upload-media
// @desc    Upload an image/media file for the module builder
// @access  Private (admin only with manage_modules permission)
router.post("/upload-media", requireRole(ADMIN_ROLES), requirePermission('manage_modules'), uploadMiddleware, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    // multer-s3 populates req.file.location with the public URL
    // multer diskStorage populates req.file.filename
    const baseUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const fileUrl = req.file.location || `${baseUrl}/uploads/${req.file.filename}`;

    return res.status(201).json({
        success: true,
        message: "File uploaded successfully.",
        url: fileUrl
    });
});

// @route   PUT /api/modules/:id
// @desc    Update/Edit an existing training module
// @access  Private (admin only with manage_modules permission)
router.put(
  "/:id",
  requireRole(ADMIN_ROLES),
  requirePermission("manage_modules"),
  moduleController.updateModule
);

// @route   GET /api/modules/:id/edit-details
// @desc    Get complete module structure for builder wizard editing
// @access  Private (admin only)
router.get("/:id/edit-details", requireRole(ADMIN_ROLES), requirePermission('manage_modules'), moduleController.getModuleForEditing);


router.get("/:id/details", requireRole(MODULE_VIEWER_ROLES), moduleController.getModuleSyllabusDetails);
// @route   GET /api/modules/available
// @desc    Get all available modules for residents
// @access  Private
router.get("/available", moduleController.getAvailableModules);

// @route   POST /api/modules/:id/enroll
// @desc    Enroll the current user in a module
// @access  Private
router.post("/:id/enroll", moduleController.enrollInModule);

// @route   GET /api/modules/:id/viewer
// @desc    Get module data, steps, and progress for the viewer
// @access  Private
router.get("/:id/viewer", requireRole(MODULE_VIEWER_ROLES), moduleController.getModuleViewerData);

// @route   GET /api/modules/steps/:stepId/assessment
// @desc    Get questions and choices for a specific assessment step
router.get("/steps/:stepId/assessment", moduleController.getStepAssessment);

// @route   GET /api/modules/:id/progress
// @desc    Get module progress percentage
// @access  Private
router.get("/:id/progress", moduleProgressController.getModuleProgress);

// @route   POST /api/modules/progress
// @desc    Synchronize module progress percentage
// @access  Private
router.post("/progress", moduleProgressController.syncModuleProgress);

// @route   POST /api/modules/:id/steps/:stepId/complete
// @desc    Mark a step as complete
// @access  Private
router.post("/:id/steps/:stepId/complete", moduleProgressController.completeModuleStep);

// Final assessments run as server-owned attempts (answer key revealed per answered question)
// @route   POST /api/modules/:id/steps/:stepId/attempts
// @desc    Start or resume an attempt
// @access  Private
router.post("/:id/steps/:stepId/attempts", quizAttemptController.startAttempt);

// @route   POST /api/modules/attempts/:attemptId/answers
// @desc    Lock in the answer to the current question
// @access  Private
router.post("/attempts/:attemptId/answers", quizAttemptController.answerQuestion);

// @route   POST /api/modules/attempts/:attemptId/next
// @desc    Move to the next question
// @access  Private
router.post("/attempts/:attemptId/next", quizAttemptController.nextQuestion);

// @route   POST /api/modules/attempts/:attemptId/tab-switches
// @desc    Record leaving the browser tab mid-attempt
// @access  Private
router.post("/attempts/:attemptId/tab-switches", quizAttemptController.reportTabSwitch);

// @route   POST /api/modules/attempts/:attemptId/submit
// @desc    Grade the recorded answers and complete the step
// @access  Private
router.post("/attempts/:attemptId/submit", quizAttemptController.submitAttempt);

module.exports = router;
