const pool = require("../config/db");

// @route   POST /api/modules
// @desc    Create a new module
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

  // Validation Check
  if (!moduleName || !moduleCategory || !duration) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: moduleName, moduleCategory, and duration are mandatory.",
    });
  }

  try {
    // Column order matches VALUES sequence perfectly.
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

// @route   GET /api/modules/available
// @desc    Get available modules for residents
// @access  Private
exports.getAvailableModules = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT mod_id as id, modname as title, modcat as category, level, duration, description
      FROM module_data
      ORDER BY mod_id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching available modules:", error);
    res.status(500).json({ error: "Server Error" });
  }
};
