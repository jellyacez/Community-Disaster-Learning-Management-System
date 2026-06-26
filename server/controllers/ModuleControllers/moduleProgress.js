const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");

router.get("/:moduleId/progress", betterAuthMiddleware, async (req, res) => {
    
   
    const { moduleId } = req.params;
    
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
});

module.exports = router;