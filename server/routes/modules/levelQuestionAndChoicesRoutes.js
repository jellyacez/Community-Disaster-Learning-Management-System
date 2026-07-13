const express = require("express");
const router = express.Router();
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");
const { questionCreation, choicesCreation } = require("../../controllers/modules/moduleQuestionAndChoices");
const requirePermission = require("../../middleware/requirePermission");

router.post("/:moduleId/questions", betterAuthMiddleware, adminMiddleware, requirePermission('manage_modules'), async (req, res) => {
   
    const { moduleId } = req.params;  
    const { questionText, points, imageURL } = req.body;
    
    try {
        
        const result = await questionCreation(moduleId, questionText, points, imageURL)
        
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
                message: `Foreign Key Violation: Module ID ${moduleId} does not exist.`
            });
        }
        
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred."
        });
    }
});


router.post("/:questionId/choices", betterAuthMiddleware, adminMiddleware, requirePermission('manage_modules'), async (req, res) => {
 
    const { questionId } = req.params;
    const { choiceText, isCorrect, rationale } = req.body;

    try {
       const result = await choicesCreation(questionId, choiceText, isCorrect, rationale);
        
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
