const express = require("express");
const router = express.Router();
const moduleController = require("../../controllers/ModuleControllers/moduleController");
const moduleProgressController = require("../../controllers/ModuleControllers/moduleProgressController");
const adminMiddleware = require("../../middleware/adminMiddleware");
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");

// @route   POST /api/modules
// @desc    Create a new training module
// @access  Private (admin only)
router.post("/", adminMiddleware, moduleController.createModule);

// @route   GET /api/modules/available
// @desc    Get all available modules for residents
// @access  Private
router.get("/available", betterAuthMiddleware, moduleController.getAvailableModules);

// @route   POST /api/modules/:id/enroll
// @desc    Enroll the current user in a module
// @access  Private
router.post("/:id/enroll", betterAuthMiddleware, moduleController.enrollInModule);

// @route   GET /api/modules/:id/viewer
// @desc    Get module data, steps, and progress for the viewer
// @access  Private
router.get("/:id/viewer", betterAuthMiddleware, moduleController.getModuleViewerData);

// @route   GET /api/modules/:id/progress
// @desc    Get module progress percentage
// @access  Private
router.get("/:id/progress", betterAuthMiddleware, moduleProgressController.getModuleProgress);

// @route   POST /api/modules/:id/steps/:stepId/complete
// @desc    Mark a step as complete
// @access  Private
router.post("/:id/steps/:stepId/complete", betterAuthMiddleware, moduleProgressController.completeModuleStep);

module.exports = router;
