const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");

// @desc    Creates a new step for a specific module
// @access  Private
router.post("/:moduleId", betterAuthMiddleware, async (req, res) => {

    const {moduleId} =  req.params;
    const { stepOrder, stepTitle, stepContent, mediaUrl, stepType } = req.body;

        const stepCreation = await pool.query(
            `INSERT INTO public.module_steps (mod_id, step_order, step_title, step_content, media_url, step_type) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`, 
            [moduleId, stepOrder, stepTitle, stepContent, mediaUrl, stepType]
        );
        
        return res.status(201).json({
            success: true,
            message: "Module step added successfully.",
            data: stepCreation.rows[0]
        });
        
    } catch (error) {
        console.error("Error inserting module step:", error);
        
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: `Foreign Key Violation: Module ID ${moduleId} does not exist.`
            });
        }
        
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: `Validation Error: Step order ${stepOrder} already exists for this module.`
            });
        }

        return res.status(500).json({
            success: false,
            message: "An internal server error occurred."
        });
    }


});
// --- End of POST /:moduleId ---
