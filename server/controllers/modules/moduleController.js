const pool = require("../../config/db");

// @desc    Creates a new module in the database
// @access  Private (admin only)
exports.createModule = async (req, res) => {
  const {
    moduleName,
    moduleCategory,
    description,
    level,
    duration,
    video_url,
    image_url,
  } = req.body;

  if (!moduleName || !moduleCategory || !duration) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: moduleName, moduleCategory, and duration are mandatory.",
    });
  }

  try {
    const moduleCreation = await pool.query(
      `INSERT INTO public.module_data (modname, modcat, description, level, duration, video_url, image_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
      [
        moduleName,
        moduleCategory,
        description,
        level,
        duration,
        video_url,
        image_url,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Module created successfully.",
      data: moduleCreation.rows[0],
    });
  } catch (error) {
    console.error("Error creating module:", error);
    return res.status(500).json({
      success: false,
      message: "An internal server error occurred while creating the module.",
    });
  }
};
// --- End of createModule ---

// @desc    Fetches all modules that the current user is not enrolled in
// @access  Private
exports.getAvailableModules = async (req, res) => {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await pool.query(
      `
      SELECT 
        md.mod_id as id, 
        md.modname as title, 
        md.modcat as category, 
        md.level, 
        md.duration, 
        md.description
      FROM module_data md
      LEFT JOIN module_activity ma ON md.mod_id = ma.mod_id AND ma.user_id = $1
      WHERE ma.modact_id IS NULL
      ORDER BY md.mod_id DESC
    `,
      [user_id],
    );
    res.json(result.rows);
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

  if (!user_id) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized. Please log in." });
  }

  if (!mod_id || isNaN(mod_id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid module ID." });
  }

  try {
    const moduleCheck = await pool.query(
      "SELECT mod_id FROM module_data WHERE mod_id = $1",
      [mod_id],
    );
    if (moduleCheck.rowCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Module not found." });
    }

    const enrollmentCheck = await pool.query(
      "SELECT 1 FROM module_activity WHERE user_id = $1 AND mod_id = $2 LIMIT 1",
      [user_id, mod_id],
    );

    if (enrollmentCheck.rowCount > 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "You are already enrolled in this module.",
        });
    }

    await pool.query(
      `INSERT INTO module_activity (user_id, mod_id, modstatus, progress) 
       VALUES ($1, $2, 'In Progress', 0)`,
      [user_id, mod_id],
    );

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

  if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    // Check enrollment status
    const enrollmentCheck = await pool.query(
      "SELECT 1 FROM module_activity WHERE user_id = $1 AND mod_id = $2 LIMIT 1",
      [user_id, mod_id]
    );

    if (enrollmentCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this module." });
    }

    // Get module data
    const moduleResult = await pool.query(
      "SELECT mod_id as id, modname as title, modcat as category FROM module_data WHERE mod_id = $1",
      [mod_id]
    );

    if (moduleResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Module not found." });
    }

    // Get module steps
    const stepsResult = await pool.query(
      `SELECT ms.step_id as id, ms.step_order, ms.step_type as type, ms.step_title as title, ms.step_content as content, ms.media_url
       FROM module_steps ms
       JOIN levels l ON ms.level_id = l.level_id
       WHERE l.mod_id = $1
       ORDER BY l.level_order ASC, ms.step_order ASC`,
      [mod_id]
    );

    // Calculate current progress
    const progressResult = await pool.query(
      `SELECT COALESCE(MAX(ms.step_order), 0) as current_progress_order
       FROM user_step_progress usp
       JOIN module_steps ms ON usp.step_id = ms.step_id
       JOIN levels l ON ms.level_id = l.level_id
       WHERE usp.user_id = $1 AND l.mod_id = $2`,
      [user_id, mod_id]
    );

    const currentProgressOrder = parseInt(progressResult.rows[0].current_progress_order, 10);

    return res.status(200).json({
      success: true,
      data: {
        module: moduleResult.rows[0],
        steps: stepsResult.rows,
        currentProgressOrder
      }
    });
  } catch (error) {
    console.error("Error fetching module viewer data:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

