const express = require("express");
const router = express.Router();
const { authenticate } = require("../../middleware/authenticate");

// Apply authentication to all routes
router.use(authenticate);

const requireRole = require("../../middleware/requireRole");
const { ADMIN_ROLES } = require("../../config/permissions");
const { stepCreation } = require("../../controllers/modules/moduleStepsController");

const requirePermission = require("../../middleware/requirePermission");

router.post("/steps/:levelId", requireRole(ADMIN_ROLES), requirePermission('manage_modules'), async (req, res) => {

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
