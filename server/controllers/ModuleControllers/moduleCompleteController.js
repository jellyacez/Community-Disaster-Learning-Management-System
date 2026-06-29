const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");

router.post("/:moduleId/steps/:stepId/complete", betterAuthMiddleware, async (req, res) => {
    const { moduleId, stepId } = req.params;
    const userId = req.user?.id;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Record the individual step completion progress
        await client.query(
            `INSERT INTO public.user_step_progress (user_id, step_id)
             VALUES ($1, $2)
             ON CONFLICT (user_id, step_id) DO NOTHING`,
            [userId, stepId]
        );

        // 2. Re-calculate completion statistics mid-transaction 
        // FIX: Added INNER JOIN to public.levels to bridge the module_data and module_steps relationship
        const statsQuery = await client.query(`
            SELECT 
                COUNT(s.step_id) AS total_steps,
                COUNT(p.step_id) AS completed_steps
            FROM public.module_steps s
            INNER JOIN public.levels l ON s.level_id = l.level_id
            LEFT JOIN public.user_step_progress p ON s.step_id = p.step_id AND p.user_id = $1
            WHERE l.mod_id = $2
        `, [userId, moduleId]);

        const { total_steps, completed_steps } = statsQuery.rows[0];
        
        const total = parseInt(total_steps, 10);
        const completed = parseInt(completed_steps, 10);
        
        let moduleStatus = "In Progress";
        let isFullyCompleted = false;

        // 3. Conditional evaluation
        if (total > 0 && completed === total) {
            moduleStatus = "Completed";
            isFullyCompleted = true;

            await client.query(
                `UPDATE public.module_activity 
                 SET modstatus = $1, modend = $2
                 WHERE user_id = $3 AND mod_id = $4`,
                [moduleStatus, new Date().toISOString(), userId, moduleId]
            );
        }

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: isFullyCompleted ? "Module fully completed!" : "Step progress recorded.",
            data: {
                totalSteps: total,
                completedSteps: completed,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
                status: moduleStatus
            }
        });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error processing step completion transaction:", error);
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred while processing progress."
        });
    } finally {
        client.release();
    }
});

module.exports = router;