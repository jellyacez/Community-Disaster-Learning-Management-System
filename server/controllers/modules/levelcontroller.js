const pool = require("../../config/db");
const { cleanRichText } = require("../../utils/sanitizeHtml");

const levelCreation = async (moduleId,levelOrder,levelTitle,levelDescription)=> {
    const safeDescription = cleanRichText(levelDescription);
    const result = await pool.query(`
        INSERT INTO public.levels (mod_id, level_order, level_title, level_description)
        VALUES ($1, $2, $3, $4) 
        RETURNING *
        `,[moduleId,levelOrder,levelTitle,safeDescription]);
        return result;
            
}

module.exports = {levelCreation};


