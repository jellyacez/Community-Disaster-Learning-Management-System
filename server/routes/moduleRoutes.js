const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/moduleController");
const adminMiddleware = require("../middleware/adminMiddleware");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");

// @route   POST /api/modules
// @desc    Create a new module
// @access  Private (admin only)
router.post("/", adminMiddleware, moduleController.createModule);

// @route   GET /api/modules/available
// @desc    Get all available modules
// @access  Private
router.get("/available", betterAuthMiddleware, moduleController.getAvailableModules);

module.exports = router;
