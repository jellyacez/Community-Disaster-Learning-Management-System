const pool = require("../../config/db");


const levelResult = async (levelId, userId, answers) => {
    // 1. Validate answers format
    if (!answers || !Array.isArray(answers)) {
        throw new Error("Answers array is required");
    }

    // 2. Fetch all questions for this level to get their points
    const questionsResult = await pool.query(
        `SELECT question_id, points FROM public.questions WHERE mod_id = $1`,
        [levelId]
    );
    const questions = questionsResult.rows;
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);

    // 3. Fetch all correct choices for these questions
    const correctChoicesResult = await pool.query(
        `SELECT c.question_id, c.choice_id 
         FROM public.choices c 
         JOIN public.questions q ON c.question_id = q.question_id 
         WHERE q.mod_id = $1 AND c.is_correct = true`,
        [levelId]
    );

    // Create maps for quick lookup
    const correctMap = {};
    correctChoicesResult.rows.forEach(row => {
        correctMap[row.question_id] = row.choice_id;
    });

    const pointsMap = {};
    questions.forEach(q => {
        pointsMap[q.question_id] = q.points || 1;
    });

    // 4. Calculate the score based on submitted answers
    let score = 0;
    answers.forEach(ans => {
        if (correctMap[ans.questionId] === ans.choiceId) {
            score += pointsMap[ans.questionId] || 1;
        }
    });

    // 5. Determine if passed (75% passing grade)
    const passed = totalPoints > 0 ? (score / totalPoints) >= 0.75 : true;

    // 6. Insert the result
    const result = await pool.query(
        `INSERT INTO public.results (mod_id, user_id, score, total_points, passed)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [levelId, userId, score, totalPoints, passed]
    );

    return result.rows[0];
};

module.exports = { levelResult };