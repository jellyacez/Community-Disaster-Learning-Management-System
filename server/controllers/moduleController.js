const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");


router.post("/", betterAuthMiddleware, async (req, res) => {
    const { moduleName, moduleCategory, description, level, duration, video_url, image_url } = req.body;
    
    

    try {
        



        const moduleCreation = await pool.query(
            `INSERT INTO public.module_data (modname, modcat, description, level, duration, video_url, image_url) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`, 
            [moduleName, moduleCategory, description, level, duration, video_url, image_url]
        );
        
        
        return res.status(201).json({
            success: true,
            message: "Module created successfully.",
            data: moduleCreation.rows[0]
        });
        
    } catch (error) {
       
        console.error("Error creating module:", error);
        return res.status(500).json({
            success: false,
            message: "An internal server error occurred while creating the module."
        });
    }
});

module.exports = router;