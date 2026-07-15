const pool = require("../../config/db");
const logger = require('../../utils/logger');

class ModuleProgressService {
  async completeModuleStep(user_id, mod_id, stepId, answers) {
    // Verify user enrollment
    const enrollmentCheck = await pool.query(
      "SELECT 1 FROM module_activity WHERE user_id = $1 AND mod_id = $2 LIMIT 1",
      [user_id, mod_id]
    );

    if (enrollmentCheck.rowCount === 0) {
      throw new Error("NOT_ENROLLED");
    }

    // Get step details
    const stepResult = await pool.query(
      `SELECT ms.step_order, ms.step_type, ms.is_final_assessment, ms.loop_back_step_id, l.level_id, l.passing_threshold, ms.step_title
       FROM module_steps ms
       JOIN levels l ON ms.level_id = l.level_id
       WHERE ms.step_id = $1 AND l.mod_id = $2`,
      [stepId, mod_id]
    );

    if (stepResult.rowCount === 0) {
      throw new Error("NOT_FOUND");
    }
    
    const step = stepResult.rows[0];

    // If step is a quiz, grade it
    let score = 0;
    let totalPoints = 0;
    let passed;
    let quizGraded = false;

    if (step.step_type === 'quiz' || step.step_type === 'situational' || step.step_type === 'priority_action' || step.step_type === 'hazard_identification' || step.step_type === 'action_sequence') {
        quizGraded = true;
        if (!answers || !Array.isArray(answers)) {
            throw new Error("ANSWERS_REQUIRED");
        }
        
        const questionsResult = await pool.query(
            `SELECT question_id, points FROM public.questions WHERE step_id = $1`,
            [stepId]
        );
        const questions = questionsResult.rows;
        totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

        const correctChoicesResult = await pool.query(
            `SELECT c.question_id, c.choice_id, c.sequence_order, c.rationale 
             FROM public.choices c 
             JOIN public.questions q ON c.question_id = q.question_id 
             WHERE q.step_id = $1 AND c.is_correct = true`,
            [stepId]
        );

        const pointsMap = {};
        questions.forEach(q => {
            pointsMap[q.question_id] = q.points || 1;
        });

        // Grade based on step_type
        if (step.step_type === 'hazard_identification') {
             const correctChoicesMap = {};
             correctChoicesResult.rows.forEach(row => {
                 if (!correctChoicesMap[row.question_id]) correctChoicesMap[row.question_id] = [];
                 correctChoicesMap[row.question_id].push(row.choice_id);
             });
             
             answers.forEach(ans => {
                 const correctArray = (correctChoicesMap[ans.questionId] || []).sort((a, b) => a - b);
                 const submittedArray = (ans.selectedChoiceIds || []).sort((a, b) => a - b);
                 
                 if (JSON.stringify(correctArray) === JSON.stringify(submittedArray)) {
                     score += pointsMap[ans.questionId] || 1;
                 }
             });
        } else if (step.step_type === 'action_sequence') {
             const sequenceMap = {};
             correctChoicesResult.rows.forEach(row => {
                 if (!sequenceMap[row.question_id]) sequenceMap[row.question_id] = [];
                 sequenceMap[row.question_id].push({ choice_id: row.choice_id, order: row.sequence_order });
             });
             
             answers.forEach(ans => {
                 const correctSequence = (sequenceMap[ans.questionId] || [])
                     .sort((a, b) => a.order - b.order)
                     .map(c => c.choice_id);
                 
                 const submittedSequence = ans.selectedChoiceIds || [];
                 
                 if (JSON.stringify(correctSequence) === JSON.stringify(submittedSequence)) {
                     score += pointsMap[ans.questionId] || 1;
                 }
             });
        } else {
             const correctMap = {};
             correctChoicesResult.rows.forEach(row => {
                 correctMap[row.question_id] = row.choice_id;
             });

             answers.forEach(ans => {
                 const submittedChoiceId = ans.selectedChoiceIds && ans.selectedChoiceIds.length > 0 ? ans.selectedChoiceIds[0] : null;
                 if (correctMap[ans.questionId] === submittedChoiceId) {
                     score += pointsMap[ans.questionId] || 1;
                 }
             });
        }

        const passingThreshold = step.passing_threshold || 80;
        const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 100;
        passed = percentage >= passingThreshold;

        // Save result
        await pool.query(
            `INSERT INTO public.results (mod_id, level_id, step_id, user_id, score, total_points, passed)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [mod_id, step.level_id, stepId, user_id, score, totalPoints, passed]
        );
        
        let dynamicLoopBackId = step.loop_back_step_id;
        if (!step.is_final_assessment && !dynamicLoopBackId) {
             const prevStepResult = await pool.query(
                 `SELECT step_id FROM module_steps 
                  WHERE level_id = $1 AND step_order < $2 AND step_type IN ('text', 'video')
                  ORDER BY step_order DESC LIMIT 1`,
                 [step.level_id, step.step_order]
             );
             if (prevStepResult.rowCount > 0) {
                 dynamicLoopBackId = prevStepResult.rows[0].step_id;
             } else {
                 const firstStepResult = await pool.query(
                     `SELECT step_id FROM module_steps WHERE level_id = $1 ORDER BY step_order ASC LIMIT 1`,
                     [step.level_id]
                 );
                 if (firstStepResult.rowCount > 0) {
                     dynamicLoopBackId = firstStepResult.rows[0].step_id;
                 }
             }
        }

        if (!passed) {
             return {
                  passed: false,
                  score,
                  totalPoints,
                  percentage,
                  loop_back_step_id: step.is_final_assessment ? null : dynamicLoopBackId, 
                  is_final_assessment: step.is_final_assessment,
                  message: "You did not meet the passing threshold."
             };
        }
    }

    // Update progress transaction
    const client = await pool.connect();
    let moduleCompleted;
    
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO user_step_progress (user_id, step_id) VALUES ($1, $2) ON CONFLICT (user_id, step_id) DO NOTHING`,
        [user_id, stepId]
      );

      // Check total steps in the entire module
      const totalStepsRes = await client.query(
        `SELECT COUNT(step_id) as total_steps FROM module_steps WHERE level_id IN (SELECT level_id FROM levels WHERE mod_id = $1)`, 
        [mod_id]
      );
      const totalSteps = parseInt(totalStepsRes.rows[0].total_steps, 10);

      // Check how many unique steps this user has completed for this module
      const completedStepsRes = await client.query(
        `SELECT COUNT(DISTINCT usp.step_id) as completed_steps 
         FROM user_step_progress usp
         JOIN module_steps ms ON usp.step_id = ms.step_id
         WHERE usp.user_id = $1 AND ms.level_id IN (SELECT level_id FROM levels WHERE mod_id = $2)`,
        [user_id, mod_id]
      );
      const completedSteps = parseInt(completedStepsRes.rows[0].completed_steps, 10);
      
      moduleCompleted = completedSteps >= totalSteps && totalSteps > 0;
      const modStatus = moduleCompleted ? 'Completed' : 'In Progress';
      const modulePercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 100;

      const updateResult = await client.query(
        `UPDATE module_activity 
         SET progress = $1, modstatus = $2::varchar, 
             completed_at = CASE WHEN $2::varchar = 'Completed' AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END 
         WHERE user_id = $3 AND mod_id = $4
         RETURNING modact_id`,
        [modulePercentage, modStatus, user_id, mod_id]
      );
      
      const modact_id = updateResult.rows[0]?.modact_id;

      // Handle Completion logic & Certificates
      if (moduleCompleted) {
        const modResult = await client.query(`SELECT modname FROM module_data WHERE mod_id = $1`, [mod_id]);
        const modTitle = modResult.rows.length > 0 ? modResult.rows[0].modname : 'Unknown Module';

        logger.logActivity(user_id, `Completed module: ${modTitle}`);

        const certCheck = await client.query(
          `SELECT cert_id FROM certificates WHERE user_id = $1 AND module_id = $2`, 
          [user_id, mod_id]
        );

        if (certCheck.rowCount === 0) {
          const resultIdCheck = await client.query(
            `SELECT result_id FROM results WHERE user_id = $1 AND mod_id = $2 ORDER BY result_id DESC LIMIT 1`, 
            [user_id, mod_id]
          );
          const result_id = resultIdCheck.rows.length > 0 ? resultIdCheck.rows[0].result_id : 0;
          
          const cert_rec = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

          const certInsert = await client.query(
            `INSERT INTO certificates (user_id, modact_id, result_id, cert_rec, module_id, completion_date) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING cert_id`,
            [user_id, modact_id, result_id, cert_rec, mod_id]
          );
          
          if (certInsert.rowCount > 0) {
            const certId = certInsert.rows[0].cert_id;
            logger.logActivity(user_id, `Earned certificate: ${modTitle} (ID: CERT-${certId})`);
          }
        }
      }

      await client.query("COMMIT");

      return {
        passed: true,
        quizGraded,
        score,
        totalPoints,
        moduleCompleted
      };
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  }

  async getModuleProgress(userId, moduleId) {
    const progressQuery = await pool.query(`
        SELECT
            m.mod_id,
            COUNT(s.step_id) AS total_steps,
            COUNT(p.step_id) AS completed_steps,
            CASE
                WHEN COUNT(s.step_id) = 0 THEN 0
                ELSE ROUND((COUNT(p.step_id)::numeric / COUNT(s.step_id)::numeric) * 100)
            END AS completion_percentage
        FROM public.module_data m
        LEFT JOIN public.levels l ON m.mod_id = l.mod_id
        LEFT JOIN public.module_steps s ON l.level_id = s.level_id
        LEFT JOIN public.user_step_progress p ON s.step_id = p.step_id AND p.user_id = $1
        WHERE m.mod_id = $2
        GROUP BY m.mod_id
    `, [userId, moduleId]);

    if (progressQuery.rows.length === 0) {
        throw new Error("NOT_FOUND");
    }
    
    return progressQuery.rows[0];
  }
}

module.exports = new ModuleProgressService();
