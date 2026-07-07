const pool = require("../../config/db");
const { cleanRichText } = require("../../utils/sanitizeHtml");

const levelCreation = async (moduleId,levelOrder,levelTitle,levelDescription)=> {
    const safeDescription = cleanRichText(levelDescription);
    const result = await pool.query(`
        INSERT INTO public.levels (mod_id, level_order, level_title, level_description)
        VALUES ($1, $2, $3, $4) 
        ON CONFLICT (mod_id, level_order) 
        DO UPDATE SET 
            level_title = EXCLUDED.level_title,
            level_description = EXCLUDED.level_description
        RETURNING *
    `, [moduleId, levelOrder, levelTitle, safeDescription]);

        if (!result.rows || result.rows.length === 0) {
        throw new Error("Database failed to return the created level row.");
    }
        
        return result.rows[0];
            
}

module.exports = {levelCreation};


