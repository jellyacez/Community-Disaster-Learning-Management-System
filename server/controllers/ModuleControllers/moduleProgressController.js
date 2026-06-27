const pool = require("../../config/db");

// @desc    Mark a step as complete and update module progress
// @access  Private
exports.completeModuleStep = async (req, res) => {
  const { id: mod_id, stepId } = req.params;
  const user_id = req.user?.id;

  if (!user_id) return res.status(401).json({ success: false, message: "Unauthorized" });

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
      "SELECT step_order FROM module_steps WHERE step_id = $1 AND mod_id = $2",
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
       WHERE usp.user_id = $1 AND ms.mod_id = $2`,
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

      const totalStepsResult = await client.query("SELECT COUNT(*) as total FROM module_steps WHERE mod_id = $1", [mod_id]);
      const totalSteps = parseInt(totalStepsResult.rows[0].total, 10);

      const completedStepsResult = await client.query(
        `SELECT COUNT(*) as completed FROM user_step_progress usp JOIN module_steps ms ON usp.step_id = ms.step_id WHERE usp.user_id = $1 AND ms.mod_id = $2`,
        [user_id, mod_id]
      );
      const completedSteps = parseInt(completedStepsResult.rows[0].completed, 10);

      const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      const modStatus = percentage === 100 ? 'Completed' : 'In Progress';

      await client.query(
        `UPDATE module_activity 
         SET progress = $1, modstatus = $2, 
             completed_at = CASE WHEN $1 = 100 AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END 
         WHERE user_id = $3 AND mod_id = $4`,
        [percentage, modStatus, user_id, mod_id]
      );

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

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

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
            LEFT JOIN public.module_steps s ON m.mod_id = s.mod_id
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
