const pool = require("../../config/db");
const { cleanRichText } = require("../../utils/sanitizeHtml");

// @desc    Creates a new module and all its nested levels and steps in a transaction
// @access  Private (admin only)
exports.createModule = async (req, res) => {
  const {
    moduleName,
    moduleCategory,
    description,
    level, // Legacy audience string
    duration,
    video_url,
    image_url,
    levels // Array of nested levels
  } = req.body;

  if (!moduleName || !moduleCategory || !duration || !levels || !Array.isArray(levels)) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields or levels array.",
    });
  }

  const safeDescription = cleanRichText(description);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Insert Module
    const moduleCreation = await client.query(
      `INSERT INTO public.module_data (modname, modcat, description, level, duration, video_url, image_url) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING mod_id`,
      [moduleName, moduleCategory, safeDescription, level, duration, video_url, image_url]
    );
    const mod_id = moduleCreation.rows[0].mod_id;

    // 2. Insert Levels
    for (const lvl of levels) {
      const levelRes = await client.query(
        `INSERT INTO public.levels (mod_id, level_order, level_title, level_description, passing_threshold, is_locked_by_default)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING level_id`,
        [mod_id, lvl.levelOrder, lvl.levelTitle, cleanRichText(lvl.levelDescription || ""), lvl.passing_threshold || 80, lvl.is_locked_by_default ?? true]
      );
      const level_id = levelRes.rows[0].level_id;

      // 3. Insert Steps for this level
      let lastLearningStepId = null; // Track the most recent non-quiz step
      
      for (const step of lvl.steps) {
        // Calculate loop_back_step_id if it's a quiz
        let loopBackId = null;
        if ((step.stepType === 'quiz' || step.stepType === 'situational') && lastLearningStepId) {
           loopBackId = lastLearningStepId;
        }

        const stepRes = await client.query(
          `INSERT INTO public.module_steps (level_id, step_order, step_title, step_content, media_url, step_type, is_final_assessment, loop_back_step_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING step_id`,
          [level_id, step.stepOrder, step.stepTitle, step.stepContent, step.mediaUrl, step.stepType, step.is_final_assessment || false, loopBackId]
        );
        const step_id = stepRes.rows[0].step_id;

        // Update lastLearningStepId if this is a learning material
        if (step.stepType !== 'quiz' && step.stepType !== 'situational') {
           lastLearningStepId = step_id;
        }

        // 4. Insert Quiz Questions and Choices
        if (step.quizQuestions && step.quizQuestions.length > 0) {
          for (const q of step.quizQuestions) {
            const qRes = await client.query(
              `INSERT INTO public.questions (mod_id, step_id, question_text, points, image_url)
               VALUES ($1, $2, $3, $4, $5) RETURNING question_id`,
              [mod_id, step_id, q.questionText, 10, q.imageURL || '']
            );
            const question_id = qRes.rows[0].question_id;

            for (const opt of q.options) {
              await client.query(
                `INSERT INTO public.choices (question_id, choice_text, is_correct, rationale, sequence_order)
                 VALUES ($1, $2, $3, $4, $5)`,
                [question_id, opt.text, opt.isCorrect, cleanRichText(opt.rationale || ""), opt.sequence_order || null]
              );
            }
          }
        }
      }
    }

    await client.query("COMMIT");
    return res.status(201).json({
      success: true,
      message: "Module structure created successfully.",
      data: { mod_id }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Transaction Error creating module structure:", error);
    return res.status(500).json({
      success: false,
      message: "Transaction failed. Database changes rolled back. " + error.message,
    });
  } finally {
    client.release();
  }
};
// --- End of createModule ---

// @desc    Fetches all modules that the current user is not enrolled in
// @access  Private
exports.getAvailableModules = async (req, res) => {
  try {
    const user_id = req.user?.id;

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

  if (!mod_id || isNaN(mod_id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid module ID." });
  }

  try {
    const moduleCheck = await pool.query(
      "SELECT mod_id, modname FROM module_data WHERE mod_id = $1",
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

    require('../../utils/logger').logActivity(req.user.id, `Enrolled in module: ${moduleCheck.rows[0].modname}`);

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
    const enrollmentCheck = await pool.query(
      "SELECT 1 FROM module_activity WHERE user_id = $1 AND mod_id = $2 LIMIT 1",
      [user_id, mod_id]
    );

    if (enrollmentCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this module." });
    }

    const moduleResult = await pool.query(
      "SELECT mod_id as id, modname as title, modcat as category FROM module_data WHERE mod_id = $1",
      [mod_id]
    );

    if (moduleResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Module not found." });
    }

    const levelsResult = await pool.query(
      `SELECT level_id as id, level_order, level_title as title, level_description as description, passing_threshold, is_locked_by_default
       FROM levels WHERE mod_id = $1 ORDER BY level_order ASC`,
      [mod_id]
    );

    const stepsResult = await pool.query(
      `SELECT ms.step_id as id, ms.level_id, ms.step_order, ms.step_type as type, ms.step_title as title, ms.step_content as content, ms.media_url, ms.is_final_assessment, ms.loop_back_step_id
       FROM module_steps ms
       JOIN levels l ON ms.level_id = l.level_id
       WHERE l.mod_id = $1 ORDER BY ms.step_order ASC`,
      [mod_id]
    );

    // Get completed step IDs
    const progressResult = await pool.query(
      `SELECT usp.step_id 
       FROM user_step_progress usp
       JOIN module_steps ms ON usp.step_id = ms.step_id
       JOIN levels l ON ms.level_id = l.level_id
       WHERE usp.user_id = $1 AND l.mod_id = $2`,
      [user_id, mod_id]
    );
    const completedStepIds = progressResult.rows.map(r => r.step_id);

    // Get passed levels (levels where final assessment was passed)
    const passedLevelsResult = await pool.query(
      `SELECT DISTINCT level_id FROM results WHERE user_id = $1 AND mod_id = $2 AND passed = true`,
      [user_id, mod_id]
    );
    const passedLevelIds = passedLevelsResult.rows.map(r => r.level_id);

    // Assemble the nested structure
    const levels = levelsResult.rows.map(level => {
      // Find steps for this level
      const levelSteps = stepsResult.rows.filter(s => s.level_id === level.id);
      return {
        ...level,
        steps: levelSteps
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        module: moduleResult.rows[0],
        levels: levels,
        completedStepIds: completedStepIds,
        passedLevelIds: passedLevelIds
      }
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
    // Verify the step exists
    const stepCheck = await pool.query(
      "SELECT step_id FROM module_steps WHERE step_id = $1",
      [stepId]
    );

    if (stepCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Step not found." });
    }

    // Fetch questions
    const questionsResult = await pool.query(
      "SELECT question_id, question_text, points, image_url FROM questions WHERE step_id = $1 ORDER BY question_id ASC",
      [stepId]
    );

    const questions = questionsResult.rows;

    // Fetch choices for all these questions
    if (questions.length > 0) {
      const questionIds = questions.map(q => q.question_id);
      
      const choicesResult = await pool.query(
        "SELECT choice_id, question_id, choice_text, is_correct, rationale, sequence_order FROM choices WHERE question_id = ANY($1::int[]) ORDER BY choice_id ASC",
        [questionIds]
      );

      const allChoices = choicesResult.rows;

      // Map choices to their respective questions
      questions.forEach(q => {
        q.options = allChoices.filter(c => c.question_id === q.question_id).map(c => ({
          id: c.choice_id,
          text: c.choice_text,
          isCorrect: c.is_correct,
          rationale: c.rationale,
          sequenceOrder: c.sequence_order
        }));
      });
    }

    return res.status(200).json({
      success: true,
      data: questions
    });
  } catch (error) {
    console.error("Error fetching step assessment data:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
