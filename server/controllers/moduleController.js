const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { betterAuthMiddleware } = require("../middleware/betterAuthMiddleware");

router.get("./",betterAuthMiddleware, async (req,res) =>{

    try{
        const moduleCreation = await pool.query(
            "INSERT INTO public.module_data"
        )
    }
    catch(error){

    }
})