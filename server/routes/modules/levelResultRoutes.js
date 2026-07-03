const express = require("express");
const router = express.Router();
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");
const { levelResult } = require("../../controllers/modules/moduleResultController");

// NOTE: This route is intentionally accessible to all authenticated users (residents submit their own quiz results).
// The userId is sourced from the server-side session (req.user.id), NOT from the request body,
// preventing users from submitting results on behalf of other users.
// SEC-007: Score validation (server-side recalculation) is a separate planned fix.
router.post("/:levelId/results", betterAuthMiddleware, async (req, res) => {
    const { levelId } = req.params;

   
    const userId = req.user?.id; 

    const { score, totalPoints, passed } = req.body;

    try {
        
        const result = await levelResult(levelId ,userId ,score, totalPoints, passed);

        return res.status(201).json({
            success: true,
            message: "Result created",
            data: result
        });
    } catch (error) {
       
        console.error("Error inserting result:", error);

        if (error.code === '23503') {
            return res.status(404).json({
                success: false,
                message: "Foreign Key Error: Either the User ID or Module ID provided does not exist in the system."
            });
        }

        return res.status(500).json({
            success: false,
            message: "An internal server error occurred."
        });
    }
});
