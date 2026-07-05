const pool = require("../../config/db");


const questionCreation = async (moduleId, questionText, points, imageURL, stepId = null) => {
     const result = await pool.query(
            `INSERT INTO public.questions (mod_id, question_text, points, image_url, step_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [moduleId, questionText, points, imageURL, stepId]
        );
        return result.rows[0];
}

const choicesCreation = async (questionId, choiceText, isCorrect) => {
    const result = await pool.query(
        `INSERT INTO public.choices (question_id, choice_text, is_correct)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [questionId, choiceText, isCorrect]
    );
    return result.rows[0];
}



module.exports = { questionCreation, choicesCreation }; 