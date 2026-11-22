const pool = require("../../config/db");
const logger = require('../../utils/logger');
const { GRADED_STEP_TYPES } = require("../../config/constants");

// Days before expiry when a certificate becomes eligible for recertification
const RENEWAL_WINDOW_DAYS = 30;

// Final assessments are graded only from answers recorded in a server-owned attempt
const isAttemptStep = (step) => GRADED_STEP_TYPES.includes(step.step_type) && Boolean(step.is_final_assessment);

class ModuleProgressService {
  // `options.viaAttempt` is set only by QuizAttemptService when submitting a recorded attempt
  async completeModuleStep(user_id, mod_id, stepId, answers, options = {}) {
    const enrollmentCheck = await pool.query(
      "SELECT 1 FROM module_activity WHERE user_id = $1 AND mod_id = $2 LIMIT 1",
      [user_id, mod_id]
    );

    if (enrollmentCheck.rowCount === 0) {
      throw new Error("NOT_ENROLLED");
    }

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

    // Client-submitted answers are not accepted for final assessments
    if (isAttemptStep(step) && !options.viaAttempt) {
      throw new Error("ATTEMPT_REQUIRED");
    }

    let score = 0;
    let totalPoints = 0;
    let passed;
    let quizGraded = false;

    if (GRADED_STEP_TYPES.includes(step.step_type)) {
        quizGraded = true;
        if (!answers || !Array.isArray(answers)) {
            throw new Error("ANSWERS_REQUIRED");
        }
        
        const questionsResult = await pool.query(
            `SELECT question_id, points, interaction_type FROM public.questions WHERE step_id = $1`,
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
        const interactionTypeMap = {};
        questions.forEach(q => {
            pointsMap[q.question_id] = q.points || 1;
            interactionTypeMap[q.question_id] = q.interaction_type;
        });

        const correctChoicesMap = {};
        const sequenceMap = {};
        
        correctChoicesResult.rows.forEach(row => {
            if (!correctChoicesMap[row.question_id]) correctChoicesMap[row.question_id] = [];
            correctChoicesMap[row.question_id].push(row.choice_id);
            
            if (row.sequence_order && row.sequence_order > 0) {
                if (!sequenceMap[row.question_id]) sequenceMap[row.question_id] = [];
                sequenceMap[row.question_id].push({ choice_id: row.choice_id, order: row.sequence_order });
            }
        });

        // Grade at most one entry per question of THIS step. Unknown question IDs and
        // later duplicates are ignored, and a non-array selectedChoiceIds counts as
        // unanswered instead of rejecting the submission, so offline-queue replays
        // never turn into terminal 400s. First entry wins, matching the quiz UI lock.
        const stepQuestionIds = new Set(questions.map(q => Number(q.question_id)));
        const answersByQuestion = new Map();
        for (const ans of answers) {
            const qid = Number(ans?.questionId);
            if (!stepQuestionIds.has(qid) || answersByQuestion.has(qid)) continue;
            answersByQuestion.set(qid, Array.isArray(ans.selectedChoiceIds) ? ans.selectedChoiceIds : []);
        }

        answersByQuestion.forEach((selected, qid) => {
            const isActionSequence = sequenceMap[qid] !== undefined;
            // A stored hazard type stays multi-select even with a single required hazard
            const isMultiSelect = correctChoicesMap[qid] &&
                (correctChoicesMap[qid].length > 1 || interactionTypeMap[qid] === 'hazard_identification');

            if (isActionSequence) {
                const correctSequence = sequenceMap[qid]
                    .sort((a, b) => a.order - b.order)
                    .map(c => c.choice_id);

                if (JSON.stringify(correctSequence) === JSON.stringify(selected)) {
                    score += pointsMap[qid] || 1;
                }
            } else if (isMultiSelect) {
                const correctArray = correctChoicesMap[qid].sort((a, b) => a - b);
                const submittedArray = [...selected].sort((a, b) => a - b);

                if (JSON.stringify(correctArray) === JSON.stringify(submittedArray)) {
                    score += pointsMap[qid] || 1;
                }
            } else {
                const correctChoiceId = correctChoicesMap[qid] ? correctChoicesMap[qid][0] : null;
                const submittedChoiceId = selected.length > 0 ? selected[0] : null;

                if (correctChoiceId === submittedChoiceId) {
                    score += pointsMap[qid] || 1;
                }
            }
        });

        score = Math.min(score, totalPoints);

        const passingThreshold = step.passing_threshold || 80;
        const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 100;
        passed = percentage >= passingThreshold;

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
                 dynamicLoopBackId = null;
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

    const client = await pool.connect();
    let moduleCompleted;
    let recertificationRequired = false;
    let recertificationStepIds = [];

    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO user_step_progress (user_id, step_id) VALUES ($1, $2) ON CONFLICT (user_id, step_id) DO NOTHING`,
        [user_id, stepId]
      );

      const totalStepsRes = await client.query(
        `SELECT COUNT(step_id) as total_steps FROM module_steps WHERE level_id IN (SELECT level_id FROM levels WHERE mod_id = $1)`, 
        [mod_id]
      );
      const totalSteps = parseInt(totalStepsRes.rows[0].total_steps, 10);

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

      let verificationToken = null;
      // Sent after COMMIT so a rolled-back completion never notifies
      let certNotice = null;
      if (moduleCompleted) {
        const modResult = await client.query(`SELECT modname FROM module_data WHERE mod_id = $1`, [mod_id]);
        const modTitle = modResult.rows.length > 0 ? modResult.rows[0].modname : 'Unknown Module';

        logger.logActivity(user_id, `Completed module: ${modTitle}`);

        const certCheck = await client.query(
          `SELECT cert_id, verification_token, status, expires_at, revoked_at, revoked_by, revocation_reason 
           FROM certificates 
           WHERE user_id = $1 AND module_id = $2`, 
          [user_id, mod_id]
        );

        const { RECERTIFICATION_INTERVAL_YEARS } = require("../../config/constants");

        if (certCheck.rowCount === 0) {
          // prefer the final assessment's result, then higher levels
          const resultIdCheck = await client.query(
            `SELECT r.result_id 
             FROM results r
             JOIN module_steps ms ON r.step_id = ms.step_id
             JOIN levels l ON ms.level_id = l.level_id
             WHERE r.user_id = $1 AND r.mod_id = $2
             ORDER BY 
                 ms.is_final_assessment DESC, 
                 l.level_order DESC, 
                 r.result_id DESC
             LIMIT 1`, 
            [user_id, mod_id]
          );
          
          const result_id = resultIdCheck.rows.length > 0 ? resultIdCheck.rows[0].result_id : null;
          
          const crypto = require("crypto");
          const cert_rec = `CERT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
          const token = crypto.randomUUID();

          const certInsert = await client.query(
            `INSERT INTO certificates (
               user_id, modact_id, result_id, cert_rec, module_id, 
               completion_date, verification_token, expires_at, status
             ) 
             VALUES (
               $1, $2, $3, $4, $5, 
               CURRENT_TIMESTAMP, $6, CURRENT_TIMESTAMP + (INTERVAL '1 year' * $7), 'active'
             ) 
             ON CONFLICT (user_id, module_id) DO NOTHING 
             RETURNING cert_id, verification_token`,
            [user_id, modact_id, result_id, cert_rec, mod_id, token, RECERTIFICATION_INTERVAL_YEARS]
          );
          
          if (certInsert.rowCount > 0) {
            const certId = certInsert.rows[0].cert_id;
            verificationToken = certInsert.rows[0].verification_token;
            logger.logActivity(user_id, `Earned certificate: ${modTitle} (ID: CERT-${certId})`);
            certNotice = ["certificate_earned", `You earned a certificate for "${modTitle}".`];
          } else {
             // Lost the race, fetch the token that the other request just inserted
             const raceCheck = await client.query(
               `SELECT verification_token FROM certificates WHERE user_id = $1 AND module_id = $2`, 
               [user_id, mod_id]
             );
             if (raceCheck.rowCount > 0) {
                verificationToken = raceCheck.rows[0].verification_token;
             }
          }
        } else {
          // existing certificate: renewal / recertification
          const existingCert = certCheck.rows[0];
          // A revoked certificate is never renewed here; only reinstateCertificate clears a revocation
          const isRevoked = existingCert.status === "revoked";
          const isExpired = !isRevoked && new Date(existingCert.expires_at) < new Date();
          const isExpiringSoon = !isRevoked && new Date(existingCert.expires_at) <= new Date(Date.now() + RENEWAL_WINDOW_DAYS * 86400 * 1000);

          // Renewal requires re-passing the module's assessment inside the renewal window.
          // Step progress persists from the first completion, so completion alone proves nothing.
          // Required steps: graded steps flagged final, else every graded step. Modules with
          // no graded steps have nothing to retake and renew on completion.
          let passedRenewalAssessment = false;
          if (isExpired || isExpiringSoon) {
            const renewalCheck = await client.query(
              `WITH graded AS (
                 SELECT ms.step_id, ms.is_final_assessment
                 FROM module_steps ms
                 JOIN levels l ON ms.level_id = l.level_id
                 WHERE l.mod_id = $1 AND ms.step_type = ANY($2)
               ),
               required AS (
                 SELECT step_id FROM graded
                 WHERE is_final_assessment OR NOT EXISTS (SELECT 1 FROM graded WHERE is_final_assessment)
               )
               SELECT required.step_id
               FROM required
               WHERE NOT EXISTS (
                 SELECT 1 FROM results r
                 WHERE r.user_id = $3 AND r.mod_id = $1 AND r.step_id = required.step_id
                   AND r.passed AND r.date_taken >= $4::timestamptz - (INTERVAL '1 day' * $5)
               )`,
              [mod_id, GRADED_STEP_TYPES, user_id, existingCert.expires_at, RENEWAL_WINDOW_DAYS]
            );
            // No pending steps means every required step was re-passed (or none exist)
            recertificationStepIds = renewalCheck.rows.map((r) => r.step_id);
            passedRenewalAssessment = recertificationStepIds.length === 0;
            recertificationRequired = !passedRenewalAssessment;
          }

          if ((isExpired || isExpiringSoon) && passedRenewalAssessment) {
            // Expired/expiring-soon certificates are eligible for renewal/recertification
            await logger.logActivity(
              user_id,
              `Recertified module: ${modTitle} (Extended validity for ${RECERTIFICATION_INTERVAL_YEARS} year)`
            );

            const renewResult = await client.query(
              `UPDATE certificates 
               SET completion_date = CURRENT_TIMESTAMP,
                   expires_at = CURRENT_TIMESTAMP + (INTERVAL '1 year' * $1),
                   status = 'active',
                   recert_notified_at = NULL
               WHERE cert_id = $2
               RETURNING verification_token`,
              [RECERTIFICATION_INTERVAL_YEARS, existingCert.cert_id]
            );

            verificationToken = renewResult.rows[0]?.verification_token || existingCert.verification_token;
            certNotice = [
              "certificate_renewed",
              `Your certificate for "${modTitle}" was renewed for ${RECERTIFICATION_INTERVAL_YEARS} year${RECERTIFICATION_INTERVAL_YEARS === 1 ? "" : "s"}.`,
            ];
          } else {
            // still active with more than 30 days left: reuse the existing token
            verificationToken = existingCert.verification_token;
          }
        }
      }

      await client.query("COMMIT");

      if (certNotice) {
        require("../notif/userNotificationService").notifyUser(user_id, ...certNotice);
      }

      return {
        passed: true,
        quizGraded,
        score,
        totalPoints,
        moduleCompleted,
        recertificationRequired,
        recertificationStepIds,
        ...(verificationToken && { verificationToken })
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

  async verifyCertificateByToken(token) {
    const query = `
      SELECT 
        COALESCE(u.name, c.anonymized_name, 'Archived Resident') AS learner_name,
        m.modname AS module_title,
        m.description AS module_description,
        c.completion_date,
        c.expires_at,
        CASE 
          WHEN c.expires_at < NOW() THEN 'expired'
          ELSE c.status 
        END as status
      FROM public.certificates c
      LEFT JOIN public."user" u ON c.user_id = u.id
      JOIN public.module_data m ON c.module_id = m.mod_id
      WHERE c.verification_token = $1
    `;
    
    const result = await pool.query(query, [token]);
    return result.rowCount > 0 ? result.rows[0] : null;
  }
}

module.exports = new ModuleProgressService();
