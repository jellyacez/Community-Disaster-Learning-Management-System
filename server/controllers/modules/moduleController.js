const { validateModuleCreation } = require("../../utils/validators");
const ModuleService = require("../../services/modules/ModuleService");
const logger = require('../../utils/logger');
const pool = require("../../config/db")
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
  const user_id = req.user?.id;
  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
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
  
  // 1. Double check how your betterAuthMiddleware injects user parameters (e.g., req.user vs req.session.user)
  const user_id = req.user?.id || req.user?.userId; 

  if (!user_id) {
    return res.status(401).json({ success: false, message: "Unauthorized: User identifier missing." });
  }

  try {
    // Validate mod_id is a proper integer before querying (prevents DB type errors
    // and stack trace leaks from malformed params like "../etc" or "abc")
    const parsedModId = parseInt(mod_id, 10);
    if (isNaN(parsedModId) || parsedModId <= 0) {
      return res.status(400).json({ success: false, message: "Invalid module ID format." });
    }

    const moduleCheck = await pool.query(
      "SELECT mod_id FROM public.module_data WHERE mod_id = $1", 
      [parsedModId]
    );
    if (moduleCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Target training module not found." });
    }
    // 2. Ensure your linking table exists in your database with matching columns
    const isEnrolled = await ModuleService.checkUserEnrollment(user_id, parsedModId);
    if (!isEnrolled) {
      await ModuleService.enrollUserInModule(user_id, parsedModId);
    }
    
    const existing = await pool.query(
      `SELECT * FROM public.module_activity WHERE user_id = $1 AND mod_id = $2`,
      [user_id, parsedModId]
    );
    const enrollmentData = existing.rows[0];

    return res.status(200).json({ 
      success: true, 
      message: "Successfully enrolled in module.", 
      data: enrollmentData
    });
  } catch (error) {
    // This logs the exact database error inside your backend terminal!
    console.error("Database error during enrollment execution pipeline:", error); 
    return res.status(500).json({ success: false, message: "Internal server error completing enrollment." });
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


// @desc    Gets detailed module, level, and step properties (hierarchical view)
// @access  Private
exports.getModuleSyllabusDetails = async (req, res) => {
  const { id: mod_id } = req.params;

  try {
    // 1. Fetch parent module details
    const moduleRes = await pool.query(
      `SELECT mod_id, modname, modcat, description, level, duration, image_url 
       FROM public.module_data 
       WHERE mod_id = $1`,
      [mod_id]
    );

    if (moduleRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Module not found." });
    }

    // 2. Fetch levels assigned to this module, including threshold settings
    const levelsRes = await pool.query(
      `SELECT level_id, level_order, level_title, level_description, passing_threshold, is_locked_by_default
       FROM public.levels 
       WHERE mod_id = $1 
       ORDER BY level_order ASC`,
      [mod_id]
    );

    // 3. Fetch steps and relate them to levels
    const stepsRes = await pool.query(
      `SELECT ms.step_id, ms.level_id, ms.step_order, ms.step_title, ms.step_type, ms.is_final_assessment, ms.loop_back_step_id
       FROM public.module_steps ms
       JOIN public.levels l ON ms.level_id = l.level_id
       WHERE l.mod_id = $1
       ORDER BY ms.step_order ASC`,
      [mod_id]
    );

    // Group steps neatly into their corresponding level objects
    const structuredLevels = levelsRes.rows.map(lvl => {
      return {
        ...lvl,
        steps: stepsRes.rows.filter(step => step.level_id === lvl.level_id)
      };
    });

    return res.status(200).json({
      success: true,
      module: moduleRes.rows[0],
      levels: structuredLevels
    });

  } catch (error) {
    console.error("Error fetching complete syllabus details:", error);
    return res.status(500).json({ success: false, message: "Internal server error assembling details view." });
  }
};