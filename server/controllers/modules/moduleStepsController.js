const pool = require("../../config/db");
const { cleanRichText } = require("../../utils/sanitizeHtml");

 const stepCreation = async (levelId, stepOrder, stepTitle, stepContent, mediaUrl, stepType) => {
    const safeContent = cleanRichText(stepContent);

    const result = await pool.query(
        `INSERT INTO public.module_steps (level_id, step_order, step_title, step_content, media_url, step_type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
        [levelId, stepOrder, stepTitle, safeContent, mediaUrl, stepType]
        );
        return result.rows[0];
 }

module.exports = { stepCreation };
