const { validateModuleCreation } = require("../../utils/validators");
const ModuleService = require("../../services/modules/ModuleService");
const logger = require('../../utils/logger');

// @desc    Creates a new module and all its nested levels and steps in a transaction
// @access  Private (admin only)
exports.createModule = async (req, res) => {
  const validation = validateModuleCreation(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: validation.error,
    });
  }

  try {
    const mod_id = await ModuleService.createModuleTransaction(req.body);
    return res.status(201).json({
      success: true,
      message: "Module structure created successfully.",
      data: { mod_id }
    });
  } catch (error) {
    console.error("Transaction Error creating module structure:", error);
    return res.status(500).json({
      success: false,
      message: "Transaction failed. Database changes rolled back. " + error.message,
    });
  }
};
// --- End of createModule ---

// @desc    Fetches all modules that the current user is not enrolled in
// @access  Private
exports.getAvailableModules = async (req, res) => {
  try {
    const user_id = req.user?.id;
    const availableModules = await ModuleService.getAvailableModules(user_id);
    res.json(availableModules);
  } catch (error) {
    console.error("Error fetching available modules:", error);
    res.status(500).json({ error: "Server Error" });
  }
};
// --- End of getAvailableModules ---

// @desc    Enrolls the current authenticated user into a specific module
// @access  Private
exports.enrollInModule = async (req, res) => {
  const { id: mod_id } = req.params;
  const user_id = req.user?.id;

  if (!mod_id || isNaN(mod_id)) {
    return res.status(400).json({ success: false, message: "Invalid module ID." });
  }

  try {
    const moduleInfo = await ModuleService.getModuleById(mod_id);
    if (!moduleInfo) {
      return res.status(404).json({ success: false, message: "Module not found." });
    }

    const isEnrolled = await ModuleService.checkUserEnrollment(user_id, mod_id);
    if (isEnrolled) {
      return res.status(400).json({
        success: false,
        message: "You are already enrolled in this module.",
      });
    }

    await ModuleService.enrollUserInModule(user_id, mod_id);
    logger.logActivity(user_id, `Enrolled in module: ${moduleInfo.modname}`);

    return res.status(201).json({
      success: true,
      message: "Successfully enrolled in the module.",
    });
  } catch (error) {
    console.error("Error enrolling in module:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while enrolling.",
    });
  }
};
// --- End of enrollInModule ---

// @desc    Get module data and steps for the Module Viewer
// @access  Private
exports.getModuleViewerData = async (req, res) => {
  const { id: mod_id } = req.params;
  const user_id = req.user?.id;

  try {
    const isEnrolled = await ModuleService.checkUserEnrollment(user_id, mod_id);
    if (!isEnrolled) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this module." });
    }

    const data = await ModuleService.getModuleViewerData(user_id, mod_id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Module not found." });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error fetching module viewer data:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
// --- End of getModuleViewerData ---

// @desc    Get assessment data (questions and choices) for a specific step
// @access  Private
exports.getStepAssessment = async (req, res) => {
  const { stepId } = req.params;

  try {
    const data = await ModuleService.getStepAssessment(stepId);
    if (!data) {
      return res.status(404).json({ success: false, message: "Step not found." });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error fetching step assessment data:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
