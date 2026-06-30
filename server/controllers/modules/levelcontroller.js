
const pool = require("../../config/db");

const levelCreation = async (moduleId,levelOrder,levelTitle,levelDescription)=> {
    const result = pool.query(`
        INSERT INTO public.levels (module_id, level_order, level_title, level_description)
        VALUES ($1, $2, 3$, 4$) 
        RETURNING *
        `,[moduleId,levelOrder,levelTitle,levelDescription]);
        return result;
            
}

module.exports = {levelCreation};


