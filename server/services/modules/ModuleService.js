const pool = require("../../config/db");
const { cleanRichText } = require("../../utils/sanitizeHtml");

class ModuleService {
  /**
   * Creates a new module, including its levels, steps, questions, and choices.
   * Runs inside a single database transaction.
   */
  async createModuleTransaction({ moduleName, moduleCategory, description, level, duration, video_url, image_url, levels }) {
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
        // Guard against multiple final assessments per level
        const finalAssessmentsCount = lvl.steps.filter(s => s.is_final_assessment).length;
        if (finalAssessmentsCount > 1) {
            throw new Error(`Validation Error: Level "${lvl.levelTitle || lvl.levelOrder}" contains multiple Final Assessments. Only one final assessment is permitted per level.`);
        }
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
      return mod_id;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getAvailableModules(user_id) {
    const result = await pool.query(
     `SELECT 
        md.mod_id AS id, 
        md.modname AS title, 
        md.modcat AS category, 
        md.description, 
        md.level, 
        md.duration, 
        md.image_url,
        EXISTS (
          SELECT 1 FROM public.module_activity um 
          WHERE um.mod_id = md.mod_id AND um.user_id = $1
        ) AS is_enrolled,
        (
          SELECT um.progress FROM public.module_activity um 
          WHERE um.mod_id = md.mod_id AND um.user_id = $1
          LIMIT 1
        ) AS progress,
        (
          SELECT um.modstatus FROM public.module_activity um 
          WHERE um.mod_id = md.mod_id AND um.user_id = $1
          LIMIT 1
        ) AS status
       FROM public.module_data md
       ORDER BY md.mod_id DESC`,
      [user_id]
    );
    return result.rows;
  }

  async getModuleById(mod_id) {
    const moduleCheck = await pool.query(
      "SELECT mod_id, modname FROM module_data WHERE mod_id = $1",
      [mod_id]
    );
    return moduleCheck.rowCount > 0 ? moduleCheck.rows[0] : null;
  }

  async checkUserEnrollment(user_id, mod_id) {
    const enrollmentCheck = await pool.query(
      "SELECT 1 FROM module_activity WHERE user_id = $1 AND mod_id = $2 LIMIT 1",
      [user_id, mod_id]
    );
    return enrollmentCheck.rowCount > 0;
  }

  async enrollUserInModule(user_id, mod_id) {
    await pool.query(
      `INSERT INTO module_activity (user_id, mod_id, modstatus, progress) 
       VALUES ($1, $2, 'In Progress', 0)`,
      [user_id, mod_id]
    );
  }

  async getModuleViewerData(user_id, mod_id) {
    const moduleResult = await pool.query(
      "SELECT mod_id as id, modname as title, modcat as category FROM module_data WHERE mod_id = $1",
      [mod_id]
    );

    if (moduleResult.rowCount === 0) return null;

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

    // Get passed levels
    const passedLevelsResult = await pool.query(
      `SELECT DISTINCT level_id FROM results WHERE user_id = $1 AND mod_id = $2 AND passed = true`,
      [user_id, mod_id]
    );
    const passedLevelIds = passedLevelsResult.rows.map(r => r.level_id);

    // Assemble the nested structure
    const levels = levelsResult.rows.map(level => {
      const levelSteps = stepsResult.rows.filter(s => s.level_id === level.id);
      return {
        ...level,
        steps: levelSteps
      };
    });

    return {
      module: moduleResult.rows[0],
      levels: levels,
      completedStepIds: completedStepIds,
      passedLevelIds: passedLevelIds
    };
  }

  async getStepAssessment(stepId) {
    const stepCheck = await pool.query(
      "SELECT step_id FROM module_steps WHERE step_id = $1",
      [stepId]
    );

    if (stepCheck.rowCount === 0) return null;

    const questionsResult = await pool.query(
      "SELECT question_id, question_text, points, image_url FROM questions WHERE step_id = $1 ORDER BY question_id ASC",
      [stepId]
    );

    const questions = questionsResult.rows;

    if (questions.length > 0) {
      const questionIds = questions.map(q => q.question_id);
      
      const choicesResult = await pool.query(
        "SELECT choice_id, question_id, choice_text, is_correct, rationale, sequence_order FROM choices WHERE question_id = ANY($1::int[]) ORDER BY choice_id ASC",
        [questionIds]
      );

      const allChoices = choicesResult.rows;

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

    return questions;
  }
  async getModuleSyllabusDetails(mod_id) {
    // 1. Fetch parent module details
    const moduleRes = await pool.query(
      `SELECT mod_id, modname, modcat, description, level, duration, image_url 
       FROM public.module_data 
       WHERE mod_id = $1`,
      [mod_id]
    );

    if (moduleRes.rowCount === 0) {
      return null;
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

    return {
      module: moduleRes.rows[0],
      levels: structuredLevels
    };
  }
  async getAllModules(page = 1, limit = 10, search = "", category = "", level = "", adminContext = null) {
    if (!adminContext || !adminContext.role) {
      throw new Error("SECURITY_FAULT: Missing or invalid adminContext. Cannot safely return modules.");
    }
    const allowedUnscopedRoles = ["system_admin", "mdrrmo_admin"];

    limit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    // Structural enforcement of barangay scoping
    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      conditions.push(`barangay_id = $${idx}`);
      values.push(adminContext.barangay);
      idx++;
    } else if (!allowedUnscopedRoles.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to access module records.`);
    }

    if (search) {
      conditions.push(`modname ILIKE $${idx}`);
      values.push(`%${search}%`);
      idx++;
    }

    if (category) {
      conditions.push(`modcat = $${idx}`);
      values.push(category);
      idx++;
    }
    
    if (level) {
      conditions.push(`level = $${idx}`);
      values.push(level);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(`SELECT COUNT(*) FROM public.module_data ${where}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const result = await pool.query(
      `SELECT mod_id, modname, modcat, description, level, duration, image_url, created_at, updated_at
       FROM public.module_data ${where}
       ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, limit, offset]
    );

    return {
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new ModuleService();
