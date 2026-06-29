const express = require("express");
const router = express.Router();
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");
const { stepCreation } = require("../../controllers/ModuleControllers/moduleStepsController");

router.post("/:levelId", betterAuthMiddleware, async (req, res) => {

    const {levelsId} =  req.params;
    const { stepOrder, stepTitle, stepContent, mediaUrl, stepType } = req.body;

try{
       const result = await stepCreation(levelsId, stepOrder, stepTitle, stepContent, mediaUrl, stepType)
        return res.status(201).json({
            success: true,
            message: "Module step added successfully.",
            data: result
        });
            
    } catch (error) {
        console.error("Error inserting module step:", error);
        
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: `Foreign Key Violation: Level ID ${levelId} does not exist.`
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

module.exports = router
// --- End of POST /:moduleId ---
