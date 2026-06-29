const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");
const { completeQuery } = require("../../controllers/ModuleControllers/moduleCompleteController")
router.post("/:moduleId/steps/:stepId/complete", betterAuthMiddleware, async (req, res) => {
    const { moduleId, stepId } = req.params;
    const userId = req.user?.id;

    const client = await pool.connect();

    

    try {
         await client.query("BEGIN");
        const result = await completeQuery(client, userId, stepId,moduleId);

        await client.query("COMMIT");

        return res.status(200).json({
            success: true,
            message: result.isFullyCompleted ? "Module fully completed!" : "Step progress recorded.",
            data: {
                totalSteps: result.total,
                completedSteps: result.completed,
                percentage: result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0,
                status: result.moduleStatus,
                
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