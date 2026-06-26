const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/moduleController");
const adminMiddleware = require("../middleware/adminMiddleware");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");

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

module.exports = router;
