const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const { betterAuthMiddleware } = require("../../middleware/betterAuthMiddleware");


router.post("/:moduleId",betterAuthMiddleware, async (req,res)=>{
    const {moduleId} = req.params;
    const {levelOrder, levelTitle, levelDescription} = req.body

    try{
        const levelCreation = await pool.query(`
            INSERT INTO public.levels (module_id, level_order, level_title, level_description)
            VALUES ($1, $2, 3$, 4$) 
            RETURNING *
            `,[moduleId,levelOrder,levelTitle,levelDescription])
            return res.status(200).json({
                success:true,
                message:levelCreation.rows[0]
            });
    } catch (error){
        console.log(error);

        
        if (error.code === '23503') {
            return res.status(400).json({
                success: false,
                message: `Foreign Key Violation: Level ID ${levelsId} does not exist.`
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
})