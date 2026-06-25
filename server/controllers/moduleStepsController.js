const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");

router.post("/:moduleId", betterAuthMiddleware, async (req, res) => {

    const {moduleId} =  req.params;
    // to reduce confusion step content means the text or the body, not what type of content.
    const { stepOrder, stepTitle, stepContent, mediaUrl, stepType } = req.body;

    try {
       
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
        
        // Specific error handling for missing foreign keys (PostgreSQL error code 23503)
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: `Foreign Key Violation: Module ID ${moduleId} does not exist.`
            });
        }
        
        // Specific error handling for duplicate step order within the same module (PostgreSQL error code 23505)
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
