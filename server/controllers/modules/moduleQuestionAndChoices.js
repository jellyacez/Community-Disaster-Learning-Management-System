const pool = require("../../config/db");
const { cleanRichText } = require("../../utils/sanitizeHtml");

const questionCreation = async (moduleId, questionText, points, imageURL, stepId = null) => {
    const sanitizedQuestionText = cleanRichText(questionText);
    const result = await pool.query(
        `INSERT INTO public.questions (mod_id, question_text, points, image_url, step_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [moduleId, sanitizedQuestionText, points, imageURL, stepId]
    );
    return result.rows[0];
}

const choicesCreation = async (questionId, choiceText, isCorrect, rationale = null) => {
    const sanitizedChoiceText = cleanRichText(choiceText);
    const sanitizedRationale = rationale ? cleanRichText(rationale) : null;
    const result = await pool.query(
        `INSERT INTO public.choices (question_id, choice_text, is_correct, rationale)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [questionId, sanitizedChoiceText, isCorrect, sanitizedRationale]
    );
    return result.rows[0];
}

module.exports = { questionCreation, choicesCreation };