const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");


router.post("/:moduleId/results", betterAuthMiddleware, async (req, res) => {
    const { moduleId } = req.params;

   
    const userId = req.user?.id; 

    const { score, totalPoints, passed } = req.body;

    try {
        const resultCreation = await pool.query(
            `INSERT INTO public.results (mod_id, user_id, score, total_points, passed)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [moduleId, userId, score, totalPoints, passed]
        );

        return res.status(201).json({
            success: true,
            message: "Result created",
            data: resultCreation.rows[0]
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

module.exports = router;