const express = require("express");
const router = express.Router();
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");
const { levelCreation } = require("../../controllers/modules/levelcontroller");
router.post("/:moduleId",betterAuthMiddleware, async (req,res)=>{
    const {moduleId} = req.params;
    const {levelOrder, levelTitle, levelDescription} = req.body

    try{
        const result = await levelCreation(moduleId, levelOrder, levelTitle, levelDescription)

        return res.status(200).json({
                success:true,
                result
            });
    } catch (error){
        console.log(error);

        return res.status(500).json({
            success: false,
            message: "An internal server error occurred."
        });
    }
})
