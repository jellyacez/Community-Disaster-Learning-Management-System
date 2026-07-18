const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authenticate");

// Apply authentication to all routes
router.use(authenticate);
// modules
const moduleController = require("../../controllers/modules/moduleController");
const moduleProgressController = require("../../controllers/modules/moduleProgressController");

//middlewares
const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");


const requirePermission = require("../../middleware/requirePermission");

// @route   POST /api/modules
// @desc    Create a new training module
// @access  Private (admin only)
router.post("/", requireRole(ADMIN_ROLES), requirePermission('manage_modules'), moduleController.createModule);



router.get("/:id/details", moduleController.getModuleSyllabusDetails);
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
router.get("/:id/viewer", moduleController.getModuleViewerData);

// @route   GET /api/modules/steps/:stepId/assessment
// @desc    Get questions and choices for a specific assessment step
router.get("/steps/:stepId/assessment", moduleController.getStepAssessment);

// @route   GET /api/modules/:id/progress
// @desc    Get module progress percentage
// @access  Private
router.get("/:id/progress", moduleProgressController.getModuleProgress);

// @route   POST /api/modules/:id/steps/:stepId/complete
// @desc    Mark a step as complete
// @access  Private
router.post("/:id/steps/:stepId/complete", moduleProgressController.completeModuleStep);



module.exports = router;
