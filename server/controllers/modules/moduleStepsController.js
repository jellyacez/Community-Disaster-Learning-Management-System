const pool = require("../../config/db");
const { cleanRichText } = require("../../utils/sanitizeHtml");

 const stepCreation = async (levelId, stepOrder, stepTitle, stepContent, mediaUrl, stepType) => {
    const safeContent = cleanRichText(stepContent);

    try {
        const result = await pool.query(
            `INSERT INTO public.module_steps (level_id, step_order, step_title, step_content, media_url, step_type)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
            [levelId, stepOrder, stepTitle, safeContent, mediaUrl, stepType]
        );
        return result.rows[0];
    } catch (error) {
        console.error("Database error during step creation:", error);
        throw new Error("Failed to create module step.");
    }
 }

module.exports = { stepCreation };
