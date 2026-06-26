const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");


router.post("/:moduleId/questions", betterAuthMiddleware, async (req, res) => {
   
    const { moduleId } = req.params;
    const { questionText, points, imageURL } = req.body;
    
    try {
        
        const questionCreation = await pool.query(
            `INSERT INTO public.questions (mod_id, question_text, points, image_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [moduleId, questionText, points, imageURL]
        );
        
        return res.status(201).json({
            success: true,
            message: "Question Added Successfully!",
            data: questionCreation.rows[0]
        });

    } catch (error) {
        console.error("Error inserting question:", error);
        
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: `Foreign Key Violation: Module ID ${moduleId} does not exist.`
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred."
        });
    }
});


router.post("/:questionId/choices", betterAuthMiddleware, async (req, res) => {
 
    const { questionId } = req.params;
    const { choiceText, isCorrect } = req.body;

    try {
       
        const choicesCreation = await pool.query(
            `INSERT INTO public.choices (question_id, choice_text, is_correct)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [questionId, choiceText, isCorrect]
        );

        return res.status(201).json({
            success: true,
            message: "Choices added successfully!",
            data: choicesCreation.rows[0]
        });

    } catch (error) {
        console.error("Error inserting choices:", error);
        
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: `Foreign Key Violation: Question ID ${questionId} does not exist.` 
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred."
        });
    }
});

module.exports = router;