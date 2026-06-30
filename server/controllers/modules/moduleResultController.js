const pool = require("../../config/db");


const levelResult = async (levelId,userId,score,totalPoints,passed) =>{
        const result = await pool.query(
            `INSERT INTO public.results (level_id, user_id, score, total_points, passed)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [levelId, userId, score, totalPoints, passed]
        );
        return result.rows[0];
}





module.exports = { levelResult } ;