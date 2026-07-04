const pool = require("../../config/db");


const levelResult = async (moduleId, userId, score, totalPoints, passed) => {
        const result = await pool.query(
            `INSERT INTO public.results (mod_id, user_id, score, total_points, passed)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [moduleId, userId, score, totalPoints, passed]
        );
        return result.rows[0];
}





module.exports = { levelResult } ;