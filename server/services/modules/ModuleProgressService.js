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

        // Dynamically grade each question based on its characteristics
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

        answers.forEach(ans => {
            const isActionSequence = sequenceMap[ans.questionId] !== undefined;
            const isMultiSelect = correctChoicesMap[ans.questionId] && correctChoicesMap[ans.questionId].length > 1;

            if (isActionSequence) {
                const correctSequence = sequenceMap[ans.questionId]
                    .sort((a, b) => a.order - b.order)
                    .map(c => c.choice_id);
                const submittedSequence = ans.selectedChoiceIds || [];
                
                if (JSON.stringify(correctSequence) === JSON.stringify(submittedSequence)) {
                    score += pointsMap[ans.questionId] || 1;
                }
            } else if (isMultiSelect) {
                const correctArray = correctChoicesMap[ans.questionId].sort((a, b) => a - b);
                const submittedArray = (ans.selectedChoiceIds || []).sort((a, b) => a - b);
                
                if (JSON.stringify(correctArray) === JSON.stringify(submittedArray)) {
                    score += pointsMap[ans.questionId] || 1;
                }
            } else {
                const correctChoiceId = correctChoicesMap[ans.questionId] ? correctChoicesMap[ans.questionId][0] : null;
                const submittedChoiceId = ans.selectedChoiceIds && ans.selectedChoiceIds.length > 0 ? ans.selectedChoiceIds[0] : null;
                
                if (correctChoiceId === submittedChoiceId) {
                    score += pointsMap[ans.questionId] || 1;
                }
            }
        });

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
      let verificationToken = null;
      if (moduleCompleted) {
        const modResult = await client.query(`SELECT modname FROM module_data WHERE mod_id = $1`, [mod_id]);
        const modTitle = modResult.rows.length > 0 ? modResult.rows[0].modname : 'Unknown Module';

        logger.logActivity(user_id, `Completed module: ${modTitle}`);

        // We still check here as an early return, but we will also use ON CONFLICT DO NOTHING below
        const certCheck = await client.query(
          `SELECT cert_id, verification_token FROM certificates WHERE user_id = $1 AND module_id = $2`, 
          [user_id, mod_id]
        );

        if (certCheck.rowCount === 0) {
          // Fix 3: Get the correct result_id, prioritizing final assessments and higher levels
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
          
          const cert_rec = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
          const crypto = require("crypto");
          const token = crypto.randomUUID();
          const { RECERTIFICATION_INTERVAL_YEARS } = require("../../config/constants");

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
          // Certificate already existed before this transaction began
          verificationToken = certCheck.rows[0].verification_token;
        }
      }

      await client.query("COMMIT");

      return {
        passed: true,
        quizGraded,
        score,
        totalPoints,
        moduleCompleted,
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
        u.name AS learner_name,
        m.modname AS module_title,
        m.description AS module_description,
        c.completion_date,
        c.expires_at,
        CASE 
          WHEN c.status = 'revoked' THEN 'revoked'
          WHEN c.expires_at < NOW() THEN 'expired'
          ELSE c.status 
        END as status
      FROM public.certificates c
      JOIN public."user" u ON c.user_id = u.id
      JOIN public.module_data m ON c.module_id = m.mod_id
      WHERE c.verification_token = $1
    `;
    
    const result = await pool.query(query, [token]);
    return result.rowCount > 0 ? result.rows[0] : null;
  }

  async getAllCertificates(page = 1, limit = 10, search = "", statusFilter = "", adminContext = null) {
    if (!adminContext || !adminContext.role) {
      throw new Error("SECURITY_FAULT: Missing or invalid adminContext. Cannot safely return certificates.");
    }

    const { UNSCOPED_ACCESS_ROLES } = require("../../config/permissions");
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
      conditions.push(`u.barangay = $${idx}`);
      values.push(adminContext.barangay);
      idx++;
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to access certificate records.`);
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR m.modname ILIKE $${idx} OR c.cert_rec ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    if (statusFilter) {
      if (statusFilter === 'expired') {
        conditions.push(`c.expires_at < NOW() AND c.status != 'revoked'`);
      } else if (statusFilter === 'active') {
        conditions.push(`c.expires_at >= NOW() AND c.status = 'active'`);
      } else {
        conditions.push(`c.status = $${idx}`);
        values.push(statusFilter);
        idx++;
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) 
      FROM public.certificates c
      JOIN public."user" u ON c.user_id = u.id
      JOIN public.module_data m ON c.module_id = m.mod_id
      ${where}
    `;
    
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataQuery = `
      SELECT 
        c.cert_id,
        c.cert_rec,
        c.completion_date,
        c.expires_at,
        c.verification_token,
        c.revocation_reason,
        c.revoked_at,
        c.revoked_by,
        CASE 
          WHEN c.status = 'revoked' THEN 'revoked'
          WHEN c.expires_at < NOW() THEN 'expired'
          ELSE c.status 
        END as status,
        u.name AS learner_name,
        u.email AS learner_email,
        u.barangay AS learner_barangay,
        m.modname AS module_title
      FROM public.certificates c
      JOIN public."user" u ON c.user_id = u.id
      JOIN public.module_data m ON c.module_id = m.mod_id
      ${where}
      ORDER BY c.completion_date DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const result = await pool.query(dataQuery, [...values, limit, offset]);

    return {
      data: result.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async revokeCertificate(certId, reason, adminContext, adminUserId) {
    if (!adminContext || !adminContext.role) {
      throw new Error("SECURITY_FAULT: Missing or invalid adminContext. Cannot safely revoke certificate.");
    }
    
    if (!reason || reason.trim().length === 0) {
      throw new Error("VALIDATION_ERROR: A reason is required to revoke a certificate.");
    }

    const { UNSCOPED_ACCESS_ROLES } = require("../../config/permissions");
    
    // First fetch the cert to check scope
    const certQuery = await pool.query(
      `SELECT c.cert_id, c.cert_rec, u.barangay, u.id as learner_id
       FROM certificates c 
       JOIN public."user" u ON c.user_id = u.id 
       WHERE c.cert_id = $1`,
      [certId]
    );

    if (certQuery.rowCount === 0) {
      throw new Error("NOT_FOUND: Certificate not found.");
    }

    const cert = certQuery.rows[0];

    // Structural scoping check
    if (adminContext.role === 'barangay_admin') {
      if (!adminContext.barangay || cert.barangay !== adminContext.barangay) {
        throw new Error("SECURITY_FAULT: Out-of-scope target. Cannot revoke certificate for a resident outside your barangay.");
      }
    } else if (!UNSCOPED_ACCESS_ROLES.includes(adminContext.role)) {
      throw new Error(`SECURITY_FAULT: Unauthorized role '${adminContext.role}' attempted to revoke certificate.`);
    }

    // Perform revocation (soft delete)
    await pool.query(
      `UPDATE certificates 
       SET status = 'revoked',
           revocation_reason = $2,
           revoked_at = NOW(),
           revoked_by = $3
       WHERE cert_id = $1`,
      [certId, reason, adminUserId]
    );

    // Log the deliberate action using logActivity per instructions
    logger.logActivity(adminUserId, `Revoked certificate ${cert.cert_rec} for user ${cert.learner_id}. Reason: ${reason}`);
    
    return true;
  }
}

module.exports = new ModuleProgressService();
