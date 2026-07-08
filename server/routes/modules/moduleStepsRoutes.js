const express = require("express");
const router = express.Router();
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");
const adminMiddleware = require("../../middleware/adminMiddleware");
const { stepCreation } = require("../../controllers/modules/moduleStepsController");

const requirePermission = require("../../middleware/requirePermission");

router.post("/steps/:levelId", betterAuthMiddleware, adminMiddleware, requirePermission('manage_modules'), async (req, res) => {

    const { levelId } = req.params;
    const { stepOrder, stepTitle, stepContent, mediaUrl, stepType } = req.body;

try{
       const result = await stepCreation(levelId, stepOrder, stepTitle, stepContent, mediaUrl, stepType)
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
// --- End of POST /:levelId ---
