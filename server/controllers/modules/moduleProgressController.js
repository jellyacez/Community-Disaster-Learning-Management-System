const pool = require("../../config/db");

// @desc    Mark a step as complete and update module progress
// @access  Private
exports.completeModuleStep = async (req, res) => {
  const { id: mod_id, stepId } = req.params;
  const user_id = req.user?.id;

  try {
    // Verify user enrollment
    const enrollmentCheck = await pool.query(
      "SELECT 1 FROM module_activity WHERE user_id = $1 AND mod_id = $2 LIMIT 1",
      [user_id, mod_id]
    );

    if (enrollmentCheck.rowCount === 0) {
      return res.status(403).json({ success: false, message: "You are not enrolled in this module." });
    }

    // Get step details
    const stepResult = await pool.query(
      `SELECT ms.step_order 
       FROM module_steps ms
       JOIN levels l ON ms.level_id = l.level_id
       WHERE ms.step_id = $1 AND l.mod_id = $2`,
      [stepId, mod_id]
    );

    if (stepResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Step not found." });
    }
    
    const targetStepOrder = stepResult.rows[0].step_order;

    // Get current progress order
    const progressResult = await pool.query(
      `SELECT COALESCE(MAX(ms.step_order), 0) as current_progress_order
       FROM user_step_progress usp
       JOIN module_steps ms ON usp.step_id = ms.step_id
       JOIN levels l ON ms.level_id = l.level_id
       WHERE usp.user_id = $1 AND l.mod_id = $2`,
      [user_id, mod_id]
    );
    const currentProgressOrder = parseInt(progressResult.rows[0].current_progress_order, 10);

    // Prevent sequential spoofing
    if (targetStepOrder > currentProgressOrder + 1) {
      return res.status(403).json({ 
        success: false, 
        message: "Spoofing Detected: You cannot complete a step before unlocking it sequentially." 
      });
    }

    if (targetStepOrder <= currentProgressOrder) {
      return res.status(200).json({ success: true, message: "Step already completed." });
    }

    // Update progress transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `INSERT INTO user_step_progress (user_id, step_id) VALUES ($1, $2) ON CONFLICT (user_id, step_id) DO NOTHING`,
        [user_id, stepId]
      );

      const totalStepsResult = await client.query(
        "SELECT COUNT(*) as total FROM module_steps ms JOIN levels l ON ms.level_id = l.level_id WHERE l.mod_id = $1",
        [mod_id]
      );
      const totalSteps = parseInt(totalStepsResult.rows[0].total, 10);

      const completedStepsResult = await client.query(
        `SELECT COUNT(*) as completed 
         FROM user_step_progress usp 
         JOIN module_steps ms ON usp.step_id = ms.step_id 
         JOIN levels l ON ms.level_id = l.level_id
         WHERE usp.user_id = $1 AND l.mod_id = $2`,
        [user_id, mod_id]
      );
      const completedSteps = parseInt(completedStepsResult.rows[0].completed, 10);

      const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      const modStatus = percentage === 100 ? 'Completed' : 'In Progress';

      const updateResult = await client.query(
        `UPDATE module_activity 
         SET progress = $1, modstatus = $2, 
             completed_at = CASE WHEN $1 = 100 AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END 
         WHERE user_id = $3 AND mod_id = $4
         RETURNING modact_id`,
        [percentage, modStatus, user_id, mod_id]
      );
      
      const modact_id = updateResult.rows[0]?.modact_id;

      // Handle Completion logic & Certificates
      if (percentage === 100) {
        // Fetch module name for logging and certificate
        const modResult = await client.query(`SELECT modname FROM module_data WHERE mod_id = $1`, [mod_id]);
        const modTitle = modResult.rows.length > 0 ? modResult.rows[0].modname : 'Unknown Module';

        require('../../utils/logger').logActivity(user_id, `Completed module: ${modTitle}`);

        // Check if certificate already exists to prevent duplicates
        const certCheck = await client.query(
          `SELECT cert_id FROM certificates 
           WHERE user_id = $1 AND module_id = $2`, 
          [user_id, mod_id]
        );

        if (certCheck.rowCount === 0) {
          // Fetch result_id if exists, otherwise 0
          const resultIdCheck = await client.query(
            `SELECT result_id FROM results WHERE user_id = $1 AND mod_id = $2 ORDER BY result_id DESC LIMIT 1`, 
            [user_id, mod_id]
          );
          const result_id = resultIdCheck.rows.length > 0 ? resultIdCheck.rows[0].result_id : 0;
          
          const cert_rec = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

          // Generate an initial basic certificate record
          const certInsert = await client.query(
            `INSERT INTO certificates (user_id, modact_id, result_id, cert_rec, module_id, completion_date) 
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING cert_id`,
            [user_id, modact_id, result_id, cert_rec, mod_id]
          );
          
          if (certInsert.rowCount > 0) {
            const certId = certInsert.rows[0].cert_id;
            require('../../utils/logger').logActivity(user_id, `Earned certificate: ${modTitle} (ID: CERT-${certId})`);
          }
        }
      }

      await client.query("COMMIT");

      return res.status(200).json({ 
        success: true, 
        message: "Step completed successfully.",
        progressPercentage: percentage,
        currentProgressOrder: targetStepOrder
      });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error completing module step:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// @desc    Get the overall progress percentage for a module
// @access  Private
exports.getModuleProgress = async (req, res) => {
    const { id: moduleId } = req.params;
    const userId = req.user?.id;

    try {
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
            return res.status(404).json({
                success: false,
                message: "Module not found."
            });
        }
        
        return res.status(200).json({
            success: true,
            data: progressQuery.rows[0]
        });
    } catch (error) {
        console.error("Error Fetching module progress:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error Occurred" 
        });
    }
};
