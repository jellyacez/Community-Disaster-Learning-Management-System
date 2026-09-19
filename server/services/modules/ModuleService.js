const pool = require("../../config/db");
const { cleanRichText } = require("../../utils/sanitizeHtml");
const { UNSCOPED_ACCESS_ROLES } = require("../../config/permissions");

class ModuleService {
  /**
   * Evaluates progression locking logic for a set of modules against a user's completion records.
   */
  computeProgressionStatus(allPublishedModules, userCompletions) {
    const completedModIds = new Set(
      userCompletions
        .filter(c => c.modstatus === 'Completed' || c.progress === 100)
        .map(c => c.mod_id)
    );

    // 1. Identify all published Fundamentals
    const fundamentalModules = allPublishedModules.filter(
      m => (m.category || m.modcat || '').trim().toLowerCase() === 'fundamentals'
    );
    const hasCompletedAllFundamentals = fundamentalModules.every(m =>
      completedModIds.has(m.id || m.mod_id)
    );

    // 2. Map lock conditions per module
    return allPublishedModules.map(mod => {
      const modId = mod.id || mod.mod_id;
      const category = (mod.category || mod.modcat || '').trim();
      const level = (mod.level || '').trim();
      const isFundamental = category.toLowerCase() === 'fundamentals';

      // Tier 0: Fundamentals are always unlocked
      if (isFundamental) {
        return {
          ...mod,
          is_locked: false,
          lock_reason: null,
        };
      }

      // Tier 1+: Specialized categories locked if Fundamentals incomplete
      if (!hasCompletedAllFundamentals) {
        const remainingFundCount = fundamentalModules.filter(f => !completedModIds.has(f.id || f.mod_id)).length;
        return {
          ...mod,
          is_locked: true,
          lock_reason: `Complete all Fundamentals first (${remainingFundCount} remaining).`,
        };
      }

      // Beginner modules unlock as soon as Fundamentals are cleared
      if (level.toLowerCase() === 'beginner' || level.toLowerCase() === 'level 1') {
        return {
          ...mod,
          is_locked: false,
          lock_reason: null,
        };
      }

      // Intermediate modules require all Beginner modules of the same category
      if (level.toLowerCase() === 'intermediate' || level.toLowerCase() === 'level 2') {
        const catBeginners = allPublishedModules.filter(
          m => (m.category || m.modcat || '').trim().toLowerCase() === category.toLowerCase() &&
               ((m.level || '').trim().toLowerCase() === 'beginner' || (m.level || '').trim().toLowerCase() === 'level 1')
        );
        const hasFinishedBeginners = catBeginners.every(b => completedModIds.has(b.id || b.mod_id));

        return {
          ...mod,
          is_locked: !hasFinishedBeginners,
          lock_reason: hasFinishedBeginners ? null : `Complete all Beginner ${category} modules first.`,
        };
      }

      // Advanced modules require all Intermediate modules of the same category
      if (level.toLowerCase() === 'advanced' || level.toLowerCase() === 'level 3') {
        const catIntermediates = allPublishedModules.filter(
          m => (m.category || m.modcat || '').trim().toLowerCase() === category.toLowerCase() &&
               ((m.level || '').trim().toLowerCase() === 'intermediate' || (m.level || '').trim().toLowerCase() === 'level 2')
        );
        const hasFinishedIntermediates = catIntermediates.every(i => completedModIds.has(i.id || i.mod_id));

        return {
          ...mod,
          is_locked: !hasFinishedIntermediates,
          lock_reason: hasFinishedIntermediates ? null : `Complete all Intermediate ${category} modules first.`,
        };
      }

      return {
        ...mod,
        is_locked: false,
        lock_reason: null,
      };
    });
  }

  async checkPrerequisitesMet(user_id, target_mod_id) {
    const publishedRes = await pool.query(
      `SELECT mod_id, modname, modcat, level FROM public.module_data WHERE status = 'published' AND moddateremove IS NULL`
    );
    const userProgressRes = await pool.query(
      `SELECT DISTINCT ON (mod_id) mod_id, progress, modstatus
       FROM public.module_activity
       WHERE user_id = $1
       ORDER BY mod_id, modact_id DESC`,
      [user_id]
    );

    const evaluated = this.computeProgressionStatus(publishedRes.rows, userProgressRes.rows);
    const target = evaluated.find(m => (m.mod_id || m.id) === target_mod_id);
    return target ? !target.is_locked : true;
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
        (um.mod_id IS NOT NULL) AS is_enrolled,
        COALESCE(um.progress, 0) AS progress,
        um.modstatus AS enrollment_status
       FROM public.module_data md
       LEFT JOIN (
         SELECT DISTINCT ON (mod_id) mod_id, progress, modstatus
         FROM public.module_activity
         WHERE user_id = $1
         ORDER BY mod_id, modact_id DESC
       ) um ON um.mod_id = md.mod_id
       WHERE md.moddateremove IS NULL AND md.status = 'published'
       ORDER BY md.mod_id DESC`,
      [user_id]
    );

    const allPublished = result.rows;

    const userCompletionsRes = await pool.query(
      `SELECT DISTINCT ON (mod_id) mod_id, progress, modstatus
       FROM public.module_activity
       WHERE user_id = $1
       ORDER BY mod_id, modact_id DESC`,
      [user_id]
    );

    return this.computeProgressionStatus(allPublished, userCompletionsRes.rows);
  }

  async getModuleSyllabusDetails(mod_id, user_id = null) {
    let moduleRes;
    if (user_id) {
      moduleRes = await pool.query(
        `SELECT 
           md.mod_id, md.modname, md.modcat, md.description, md.level, md.duration, md.image_url,
           (um.mod_id IS NOT NULL) AS is_enrolled,
           COALESCE(um.progress, 0) AS progress,
           um.modstatus AS status
         FROM public.module_data md
         LEFT JOIN (
           SELECT DISTINCT ON (mod_id) mod_id, progress, modstatus
           FROM public.module_activity
           WHERE user_id = $2
           ORDER BY mod_id, modact_id DESC
         ) um ON um.mod_id = md.mod_id
         WHERE md.mod_id = $1`,
        [mod_id, user_id]
      );
    } else {
      moduleRes = await pool.query(
        `SELECT mod_id, modname, modcat, description, level, duration, image_url,
                false AS is_enrolled, 0 AS progress, null AS status
         FROM public.module_data
         WHERE mod_id = $1`,
        [mod_id]
      );
    }

    if (moduleRes.rowCount === 0) return null;

    let targetModule = moduleRes.rows[0];

    // Compute prerequisite status if user context is provided
    if (user_id) {
      const publishedRes = await pool.query(
        `SELECT mod_id, modname, modcat, level FROM public.module_data WHERE status = 'published' AND moddateremove IS NULL`
      );
      const userProgressRes = await pool.query(
        `SELECT DISTINCT ON (mod_id) mod_id, progress, modstatus
         FROM public.module_activity
         WHERE user_id = $1
         ORDER BY mod_id, modact_id DESC`,
        [user_id]
      );
      const evaluated = this.computeProgressionStatus(publishedRes.rows, userProgressRes.rows);
      const match = evaluated.find(m => (m.mod_id || m.id) === parseInt(mod_id, 10));
      if (match) {
        targetModule.is_locked = match.is_locked;
        targetModule.lock_reason = match.lock_reason;
      }
    }

    const levelsRes = await pool.query(
      `SELECT level_id, level_order, level_title, level_description, passing_threshold, is_locked_by_default
       FROM public.levels
       WHERE mod_id = $1
       ORDER BY level_order ASC`,
      [mod_id]
    );

    const stepsRes = await pool.query(
      `SELECT ms.step_id, ms.level_id, ms.step_order, ms.step_title, ms.step_type, ms.is_final_assessment, ms.loop_back_step_id
       FROM public.module_steps ms
       JOIN public.levels l ON ms.level_id = l.level_id
       WHERE l.mod_id = $1
       ORDER BY ms.step_order ASC`,
      [mod_id]
    );

    const structuredLevels = levelsRes.rows.map(lvl => ({
      ...lvl,
      steps: stepsRes.rows.filter(step => step.level_id === lvl.level_id)
    }));

    return {
      module: targetModule,
      levels: structuredLevels
    };
  }

  async createModuleTransaction({ moduleName, moduleCategory, description, level, duration, video_url, image_url, levels, status, author_id }) {
    const safeDescription = cleanRichText(description);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const moduleCreation = await client.query(
        `INSERT INTO public.module_data (modname, modcat, description, level, duration, video_url, image_url, status, author_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING mod_id`,
        [moduleName, moduleCategory, safeDescription, level, duration, video_url, image_url, status || 'draft', author_id || null]
      );
      const mod_id = moduleCreation.rows[0].mod_id;

      for (const lvl of levels) {
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

        let lastLearningStepId = null;

        for (const step of lvl.steps) {
          let loopBackId = null;
          if ((step.stepType === 'quiz' || step.stepType === 'situational') && lastLearningStepId) {
             loopBackId = lastLearningStepId;
          }

          const stepRes = await client.query(
            `INSERT INTO public.module_steps (level_id, step_order, step_title, step_content, media_url, step_type, is_final_assessment, loop_back_step_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING step_id`,
            [level_id, step.stepOrder, step.stepTitle, cleanRichText(step.stepContent || ""), step.mediaUrl, step.stepType, step.is_final_assessment || false, loopBackId]
          );
          const step_id = stepRes.rows[0].step_id;

          if (step.stepType !== 'quiz' && step.stepType !== 'situational') {
             lastLearningStepId = step_id;
          }

          if (step.quizQuestions && step.quizQuestions.length > 0) {
            const qTexts = [];
            const qPoints = [];
            const qImages = [];

            for (const q of step.quizQuestions) {
              qTexts.push(q.questionText);
              qPoints.push(10);
              qImages.push(q.imageURL || '');
            }

            const qRes = await client.query(
              `INSERT INTO public.questions (mod_id, step_id, question_text, points, image_url)
               SELECT $1, $2, t, p, i
               FROM unnest($3::text[], $4::int[], $5::text[]) WITH ORDINALITY AS u(t, p, i, ord)
               ORDER BY ord
               RETURNING question_id`,
              [mod_id, step_id, qTexts, qPoints, qImages]
            );

            const cQuestionIds = [];
            const cTexts = [];
            const cIsCorrects = [];
            const cRationales = [];
            const cSequenceOrders = [];

            step.quizQuestions.forEach((q, idx) => {
              const question_id = qRes.rows[idx].question_id;
              for (const opt of q.options) {
                cQuestionIds.push(question_id);
                cTexts.push(opt.text);
                cIsCorrects.push(opt.isCorrect);
                cRationales.push(cleanRichText(opt.rationale || ""));
                cSequenceOrders.push(opt.sequence_order || null);
              }
            });

            if (cQuestionIds.length > 0) {
              await client.query(
                `INSERT INTO public.choices (question_id, choice_text, is_correct, rationale, sequence_order)
                 SELECT q_id, c_text, c_corr, c_rat, c_seq
                 FROM unnest($1::int[], $2::text[], $3::boolean[], $4::text[], $5::int[]) WITH ORDINALITY AS u(q_id, c_text, c_corr, c_rat, c_seq, ord)
                 ORDER BY ord`,
                [cQuestionIds, cTexts, cIsCorrects, cRationales, cSequenceOrders]
              );
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

  async updateModuleTransaction(mod_id, { moduleName, moduleCategory, description, level, duration, video_url, image_url, levels, status, editor_id }) {
    const safeDescription = cleanRichText(description);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const updateModuleRes = await client.query(
        `UPDATE public.module_data 
         SET modname = $1, modcat = $2, description = $3, level = $4, duration = $5, 
             video_url = $6, image_url = $7, status = COALESCE($8, status),
             rejection_reason = CASE WHEN $8 = 'pending_review' THEN NULL ELSE rejection_reason END
         WHERE mod_id = $9
         RETURNING mod_id`,
        [moduleName, moduleCategory, safeDescription, level, duration, video_url, image_url, status || null, mod_id]
      );

      if (updateModuleRes.rowCount === 0) {
        throw new Error(`Target module with ID ${mod_id} not found.`);
      }

      await client.query(
        `DELETE FROM public.choices 
         WHERE question_id IN (
           SELECT question_id FROM public.questions 
           WHERE mod_id = $1 OR step_id IN (
             SELECT ms.step_id FROM public.module_steps ms 
             JOIN public.levels l ON ms.level_id = l.level_id 
             WHERE l.mod_id = $1
           )
         )`,
        [mod_id]
      );

      await client.query(
        `DELETE FROM public.questions 
         WHERE mod_id = $1 OR step_id IN (
           SELECT ms.step_id FROM public.module_steps ms 
           JOIN public.levels l ON ms.level_id = l.level_id 
           WHERE l.mod_id = $1
         )`,
        [mod_id]
      );

      await client.query(
        `DELETE FROM public.module_steps 
         WHERE level_id IN (SELECT level_id FROM public.levels WHERE mod_id = $1)`,
        [mod_id]
      );

      await client.query(
        `DELETE FROM public.levels WHERE mod_id = $1`,
        [mod_id]
      );

      for (const lvl of levels) {
        const finalAssessmentsCount = (lvl.steps || []).filter(s => s.is_final_assessment).length;
        if (finalAssessmentsCount > 1) {
          throw new Error(`Validation Error: Level "${lvl.levelTitle || lvl.levelOrder}" contains multiple Final Assessments. Only one final assessment is permitted per level.`);
        }

        const levelRes = await client.query(
          `INSERT INTO public.levels (mod_id, level_order, level_title, level_description, passing_threshold, is_locked_by_default)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING level_id`,
          [mod_id, lvl.levelOrder, lvl.levelTitle, cleanRichText(lvl.levelDescription || ""), lvl.passing_threshold || 80, lvl.is_locked_by_default ?? true]
        );
        const level_id = levelRes.rows[0].level_id;

        let lastLearningStepId = null;

        for (const step of (lvl.steps || [])) {
          let loopBackId = null;
          if ((step.stepType === 'quiz' || step.stepType === 'situational') && lastLearningStepId) {
            loopBackId = lastLearningStepId;
          }

          const stepRes = await client.query(
            `INSERT INTO public.module_steps (level_id, step_order, step_title, step_content, media_url, step_type, is_final_assessment, loop_back_step_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING step_id`,
            [level_id, step.stepOrder, step.stepTitle, cleanRichText(step.stepContent || ""), step.mediaUrl, step.stepType, step.is_final_assessment || false, loopBackId]
          );
          const step_id = stepRes.rows[0].step_id;

          if (step.stepType !== 'quiz' && step.stepType !== 'situational') {
            lastLearningStepId = step_id;
          }

          if (step.quizQuestions && step.quizQuestions.length > 0) {
            const qTexts = [];
            const qPoints = [];
            const qImages = [];

            for (const q of step.quizQuestions) {
              qTexts.push(q.questionText);
              qPoints.push(10);
              qImages.push(q.imageURL || '');
            }

            const qRes = await client.query(
              `INSERT INTO public.questions (mod_id, step_id, question_text, points, image_url)
               SELECT $1, $2, t, p, i
               FROM unnest($3::text[], $4::int[], $5::text[]) WITH ORDINALITY AS u(t, p, i, ord)
               ORDER BY ord
               RETURNING question_id`,
              [mod_id, step_id, qTexts, qPoints, qImages]
            );

            const cQuestionIds = [];
            const cTexts = [];
            const cIsCorrects = [];
            const cRationales = [];
            const cSequenceOrders = [];

            step.quizQuestions.forEach((q, idx) => {
              const question_id = qRes.rows[idx].question_id;
              for (const opt of (q.options || [])) {
                cQuestionIds.push(question_id);
                cTexts.push(opt.text);
                cIsCorrects.push(opt.isCorrect);
                cRationales.push(cleanRichText(opt.rationale || ""));
                cSequenceOrders.push(opt.sequence_order || null);
              }
            });

            if (cQuestionIds.length > 0) {
              await client.query(
                `INSERT INTO public.choices (question_id, choice_text, is_correct, rationale, sequence_order)
                 SELECT q_id, c_text, c_corr, c_rat, c_seq
                 FROM unnest($1::int[], $2::text[], $3::boolean[], $4::text[], $5::int[]) WITH ORDINALITY AS u(q_id, c_text, c_corr, c_rat, c_seq, ord)
                 ORDER BY ord`,
                [cQuestionIds, cTexts, cIsCorrects, cRationales, cSequenceOrders]
              );
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

  async getModuleById(mod_id) {
    const moduleCheck = await pool.query(
      "SELECT mod_id, modname, modcat, level, status, author_id, rejection_reason, parent_mod_id FROM module_data WHERE mod_id = $1",
      [mod_id]
    );
    return moduleCheck.rowCount > 0 ? moduleCheck.rows[0] : null;
  }

  async getPendingModulesReview() {
    const result = await pool.query(`
      SELECT 
        m.mod_id AS id, 
        m.modname AS title, 
        m.modcat AS category, 
        m.description, 
        m.moddateadd AS submitted_at, 
        m.status,
        m.rejection_reason,
        u.name AS author_name 
      FROM module_data m 
      LEFT JOIN "user" u ON m.author_id = u.id 
      WHERE m.status != 'draft' OR (m.status = 'draft' AND m.rejection_reason IS NOT NULL)
      ORDER BY m.moddateadd DESC
    `);
    return result.rows;
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

  async getEnrollmentData(user_id, mod_id) {
    const existing = await pool.query(
      `SELECT * FROM public.module_activity WHERE user_id = $1 AND mod_id = $2`,
      [user_id, mod_id]
    );
    return existing.rowCount > 0 ? existing.rows[0] : null;
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

    const progressResult = await pool.query(
      `SELECT usp.step_id
       FROM user_step_progress usp
       JOIN module_steps ms ON usp.step_id = ms.step_id
       JOIN levels l ON ms.level_id = l.level_id
       WHERE usp.user_id = $1 AND l.mod_id = $2`,
      [user_id, mod_id]
    );
    const completedStepIds = progressResult.rows.map(r => r.step_id);

    const passedLevelsResult = await pool.query(
      `SELECT DISTINCT level_id FROM results WHERE user_id = $1 AND mod_id = $2 AND passed = true`,
      [user_id, mod_id]
    );
    const passedLevelIds = passedLevelsResult.rows.map(r => r.level_id);

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

  async getModuleForEditing(mod_id) {
    const modRes = await pool.query(
      `SELECT mod_id, modname, modcat, description, level, duration, image_url, video_url, status, rejection_reason
       FROM public.module_data
       WHERE mod_id = $1`,
      [mod_id]
    );

    if (modRes.rowCount === 0) return null;

    const moduleData = modRes.rows[0];

    const levelsRes = await pool.query(
      `SELECT level_id, level_order, level_title, level_description, passing_threshold, is_locked_by_default
       FROM public.levels
       WHERE mod_id = $1
       ORDER BY level_order ASC`,
      [mod_id]
    );

    const stepsRes = await pool.query(
      `SELECT ms.step_id, ms.level_id, ms.step_order, ms.step_title, ms.step_content, ms.media_url, ms.step_type, ms.is_final_assessment, ms.loop_back_step_id
       FROM public.module_steps ms
       JOIN public.levels l ON ms.level_id = l.level_id
       WHERE l.mod_id = $1
       ORDER BY ms.step_order ASC`,
      [mod_id]
    );

    const stepIds = stepsRes.rows.map(s => s.step_id);

    let allQuestions = [];
    let allChoices = [];

    if (stepIds.length > 0) {
      const qRes = await pool.query(
        `SELECT question_id, step_id, question_text, points, image_url
         FROM public.questions
         WHERE step_id = ANY($1::int[])
         ORDER BY question_id ASC`,
        [stepIds]
      );
      allQuestions = qRes.rows;

      const questionIds = allQuestions.map(q => q.question_id);
      if (questionIds.length > 0) {
        const cRes = await pool.query(
          `SELECT choice_id, question_id, choice_text, is_correct, rationale, sequence_order
           FROM public.choices
           WHERE question_id = ANY($1::int[])
           ORDER BY choice_id ASC`,
          [questionIds]
        );
        allChoices = cRes.rows;
      }
    }

    const structuredLevels = levelsRes.rows.map(lvl => {
      const lvlSteps = stepsRes.rows.filter(s => s.level_id === lvl.level_id).map(step => {
        const stepQuestions = allQuestions
          .filter(q => q.step_id === step.step_id)
          .map(q => ({
            id: q.question_id,
            questionText: q.question_text,
            imageURL: q.image_url,
            points: q.points,
            options: allChoices
              .filter(c => c.question_id === q.question_id)
              .map(c => ({
                id: c.choice_id,
                text: c.choice_text,
                isCorrect: c.is_correct,
                rationale: c.rationale,
                sequence_order: c.sequence_order
              }))
          }));

        return {
          stepId: step.step_id,
          stepOrder: step.step_order,
          stepTitle: step.step_title,
          stepContent: step.step_content,
          mediaUrl: step.media_url,
          stepType: step.step_type,
          is_final_assessment: step.is_final_assessment,
          loop_back_step_id: step.loop_back_step_id,
          quizQuestions: stepQuestions
        };
      });

      return {
        levelId: lvl.level_id,
        levelOrder: lvl.level_order,
        levelTitle: lvl.level_title,
        levelDescription: lvl.level_description,
        passing_threshold: lvl.passing_threshold,
        is_locked_by_default: lvl.is_locked_by_default,
        steps: lvlSteps
      };
    });

    return {
      ...moduleData,
      levels: structuredLevels
    };
  }

  async getAllModules(page = 1, limit = 10, search = "", category = "", level = "", adminContext = null) {
    if (!adminContext || !adminContext.role) {
      throw new Error("SECURITY_FAULT: Missing or invalid adminContext. Cannot safely return modules.");
    }

    limit = Math.min(Math.max(parseInt(limit) || 10, 1), 100);
    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay_id) {
        throw new Error("SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping.");
      }
      conditions.push(`barangay_id = $${idx}`);
      values.push(adminContext.barangay_id);
      idx++;
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
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
      `SELECT mod_id, modname, modcat, description, level, duration, image_url, moddateadd AS created_at, moddateremove AS updated_at, status, rejection_reason, author_id, parent_mod_id,
       (SELECT COUNT(*) FROM public.module_steps ms JOIN public.levels l ON ms.level_id = l.level_id WHERE l.mod_id = public.module_data.mod_id) AS step_count,
       (SELECT COUNT(*) FROM public.module_data d2 WHERE d2.parent_mod_id = public.module_data.mod_id AND d2.status IN ('draft', 'pending_review')) > 0 AS has_active_draft
       FROM public.module_data ${where}
       ORDER BY moddateadd DESC LIMIT $${idx} OFFSET $${idx + 1}`,
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

  async updateModuleStatus(mod_id, status, rejection_reason = null) {
    const query = `
      UPDATE public.module_data
      SET status = $1, rejection_reason = $2
      WHERE mod_id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, rejection_reason, mod_id]);
    return result.rows[0];
  }
}

module.exports = new ModuleService();