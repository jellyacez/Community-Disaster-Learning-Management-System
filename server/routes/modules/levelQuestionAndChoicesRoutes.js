const express = require("express");
const router = express.Router();
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");
const { questionCreation, choicesCreation } = require("../../controllers/modules/moduleQuestionAndChoices");

router.post("/:levelId/questions", betterAuthMiddleware, adminMiddleware, async (req, res) => {
   
    const { levelId } = req.params;  // Fixed: route param is :levelId but was being read from wrong key
    const { questionText, points, imageURL } = req.body;
    
    try {
        
        const result = await questionCreation(levelId, questionText, points, imageURL)
        
        return res.status(201).json({
            success: true,
            message: "Question Added Successfully!",
            data: result
        });

    } catch (error) {
        console.error("Error inserting question:", error);
        
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: `Foreign Key Violation: level ID ${levelId} does not exist.`
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred."
        });
    }
});


router.post("/:questionId/choices", betterAuthMiddleware, adminMiddleware, async (req, res) => {
 
    const { questionId } = req.params;
    const { choiceText, isCorrect } = req.body;

    try {
       const result = await choicesCreation(questionId, choiceText, isCorrect)
        
        return res.status(201).json({
            success: true,
            message: "Choices added successfully!",
            data: result
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

module.exports = router
