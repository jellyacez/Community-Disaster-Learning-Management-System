const pool = require("../config/db");


 const stepCreation = async (levelsId, stepOrder, stepTitle, stepContent, mediaUrl, stepType) => {

    const result = await pool.query(
        `INSERT INTO public.module_steps (level_id, step_order, step_title, step_content, media_url, step_type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
        [levelsId, stepOrder, stepTitle, stepContent, mediaUrl, stepType]
        );
        return result.rows[0];
 }

module.exports = { stepCreation };
