const pool = require("../config/db");

const verifyPreviousCompletedLevels = async (req,res,next) =>{
   const {levelId} = req.params;
   
   const userId = req.user?.id;

    if(!userId){
        return res.status(401).json({
            success:false,
            message:"Unauthorized."
        });
    }

    try { 
        const currentLevelModule = await pool.query(`
            SELECT mod_id, level_order FROM public.levels where level_id = $1
            `,[levelId])

            if (currentLevelModule.rows.length === 0) {
                return res.status(404).json({
                    success:false,
                    message:"Level Not Found."
                })
            }

            const {mod_id, level_order} = currentLevelModule.rows[0];

            if(level_order === 1){
               return next();
            }

            const previousLevel = await pool.query(`
                SELECT level_id FROM public.levels
                WHERE mod_id = $1 AND level_order = $2`,
            [mod_id,level_order - 1])
        
            if(previousLevel.rows.length === 0) {
                return res.status(400).json({
                    success:false,
                    message:"Invalid level progression."
                })
            }

           const previousLevelId = previousLevel.rows[0].level_id;

           
            const statsQuery = await pool.query(`
            SELECT 
            COUNT(s.step_id) AS total_steps,
            COUNT(p.step_id) AS completed_steps
            FROM public.module_steps s
            LEFT JOIN public.user_step_progress p ON s.step_id = p.step_id AND p.user_id = $1
            WHERE s.level_id = $2
        `, [userId, previousLevelId]);

        const {total_steps, completed_steps} = statsQuery.rows[0];
        const total = parseInt(total_steps,10);
        const completed = parseInt(completed_steps,10);

        if(total === 0 || completed < total){
            return res.status(403).json({
                success:false,
                message:"ACCESS DENIED! Complete the previous levels first!"
            });
        }

        return next();
    }catch (error){
        console.log(error)

        return res.status(500).json({
            success:false,
            message:"Internal Sever Occured."
        });
    }
};
module.exports = {verifyPreviousCompletedLevels};