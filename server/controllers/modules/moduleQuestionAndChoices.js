const pool = require("../../config/db");


const questionCreation = async (levelId,questionText,points,imageURL) =>{
     const result = await pool.query(
            `INSERT INTO public.questions (level_id, question_text, points, image_url)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [levelId, questionText, points, imageURL]
        );
        return result.rows[0];
}

const choicesCreation = async (questionId,choiceText,isCorrect) =>{
    const result = await pool.query(`
             INSERT INTO public.choices (question_id, choice_text, is_correct)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [questionId, choiceText, isCorrect]
        );
        return result.rows[0];
}



module.exports = { questionCreation, choicesCreation };