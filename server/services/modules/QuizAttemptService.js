const crypto = require("crypto");
const pool = require("../../config/db");
const ModuleService = require("./ModuleService");
const ModuleProgressService = require("./ModuleProgressService");
const {
  GRADED_STEP_TYPES,
  QUIZ_QUESTION_SECONDS,
  QUIZ_ANSWER_GRACE_SECONDS,
  QUIZ_ATTEMPT_MAX_AGE_HOURS,
  QUIZ_TAB_SWITCH_LIMIT,
} = require("../../config/constants");

// Server-owned attempts for final assessments.
//
// The server fixes the question/option order, the current question's deadline, and each
// recorded answer (first answer wins). A question's correct answer and rationale are only
// returned once that question is answered or timed out, and grading uses only what was
// recorded here — never answers sent by the client at submit time. Attempts survive
// reloads, closed tabs, and step switches, so none of those reset the clock or the order.

const isAttemptStep = (step) =>
  Boolean(step) && GRADED_STEP_TYPES.includes(step.step_type) && Boolean(step.is_final_assessment);

const fail = (code) => new Error(code);

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const deadlineFromNow = () => new Date(Date.now() + QUIZ_QUESTION_SECONDS * 1000);
const deadlinePassed = (deadline) => Boolean(deadline) && Date.now() >= new Date(deadline).getTime();
const pastGrace = (deadline) =>
  !deadline || Date.now() > new Date(deadline).getTime() + QUIZ_ANSWER_GRACE_SECONDS * 1000;

// Mirrors the viewer's question UI: situational questions use their stored interaction type,
// or take their shape from the key when it isn't stored
function questionKind(stepType, question) {
  let type = stepType;
  if (stepType === "situational") {
    if (question.interaction_type) type = question.interaction_type;
    else if (question.options.some((o) => o.sequenceOrder > 0)) type = "action_sequence";
    else if (question.options.filter((o) => o.isCorrect).length > 1) type = "hazard_identification";
    else type = "priority_action";
  }
  if (type === "action_sequence") return "sequence";
  if (type === "hazard_identification") return "multi";
  return "single";
}

// Same rules as ModuleProgressService.completeModuleStep grading
function isAnswerCorrect(question, selected, kind) {
  const correct = question.options.filter((o) => o.isCorrect);
  const sequence = correct
    .filter((o) => o.sequenceOrder > 0)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((o) => o.id);
  if (sequence.length) return JSON.stringify(sequence) === JSON.stringify(selected);
  if (correct.length > 1 || kind === "multi") {
    const expected = correct.map((o) => o.id).sort((a, b) => a - b);
    return JSON.stringify(expected) === JSON.stringify([...selected].sort((a, b) => a - b));
  }
  return correct.length > 0 && selected.length > 0 && correct[0].id === selected[0];
}

// The stored order is only reusable if the assessment's questions/options haven't changed
function orderMatches(order, questions) {
  if (!Array.isArray(order) || order.length !== questions.length) return false;
  const byId = new Map(questions.map((q) => [q.question_id, q]));
  return order.every(({ questionId, optionIds }) => {
    const q = byId.get(questionId);
    if (!q || optionIds.length !== q.options.length) return false;
    const ids = new Set(q.options.map((o) => o.id));
    return optionIds.every((id) => ids.has(id));
  });
}

async function loadStep(db, modId, stepId) {
  const { rows } = await db.query(
    `SELECT ms.step_id, ms.step_type, ms.is_final_assessment, l.mod_id
     FROM module_steps ms
     JOIN levels l ON ms.level_id = l.level_id
     WHERE ms.step_id = $1 AND l.mod_id = $2`,
    [stepId, modId]
  );
  return rows[0] || null;
}

// The clock ran out on an unanswered current question: record it as unanswered
async function timeOutCurrentIfExpired(client, attempt) {
  const current = attempt.question_order[attempt.current_index];
  if (attempt.status !== "open" || !current || !deadlinePassed(attempt.question_deadline)) return;
  await client.query(
    `INSERT INTO quiz_attempt_answers (attempt_id, question_id, selected_choice_ids, timed_out)
     VALUES ($1, $2, '{}', true)
     ON CONFLICT (attempt_id, question_id) DO NOTHING`,
    [attempt.attempt_id, current.questionId]
  );
}

// What the learner may see: options in attempt order, and the key only for answered questions
async function buildState(attempt, questions, step) {
  const { rows: answers } = await pool.query(
    `SELECT question_id, selected_choice_ids, timed_out FROM quiz_attempt_answers WHERE attempt_id = $1`,
    [attempt.attempt_id]
  );
  const questionsById = new Map(questions.map((q) => [q.question_id, q]));
  const answersById = new Map(answers.map((a) => [a.question_id, a]));

  const ordered = attempt.question_order.map(({ questionId, optionIds }) => {
    const q = questionsById.get(questionId);
    const answer = answersById.get(questionId);
    const optionsById = new Map(q.options.map((o) => [o.id, o]));
    const options = optionIds.map((id) => {
      const o = optionsById.get(id);
      return answer
        ? { id: o.id, text: o.text, isCorrect: o.isCorrect, rationale: o.rationale, sequenceOrder: o.sequenceOrder }
        : { id: o.id, text: o.text };
    });
    const kind = questionKind(step.step_type, q);
    return {
      question_id: q.question_id,
      question_text: q.question_text,
      points: q.points,
      image_url: q.image_url,
      kind,
      options,
      rationale: answer ? q.rationale : null,
      answer: answer
        ? {
            selectedChoiceIds: answer.selected_choice_ids,
            timedOut: answer.timed_out,
            correct: isAnswerCorrect(q, answer.selected_choice_ids, kind),
          }
        : null,
    };
  });

  const current = ordered[attempt.current_index];
  const remainingSeconds =
    attempt.status === "open" && current && !current.answer && attempt.question_deadline
      ? Math.max(0, Math.ceil((new Date(attempt.question_deadline).getTime() - Date.now()) / 1000))
      : null;

  return {
    attemptId: attempt.attempt_id,
    status: attempt.status,
    currentIndex: attempt.current_index,
    total: ordered.length,
    questions: ordered,
    remainingSeconds,
    questionSeconds: QUIZ_QUESTION_SECONDS,
    tabSwitchCount: attempt.tab_switch_count,
    tabSwitchLimit: QUIZ_TAB_SWITCH_LIMIT,
  };
}

// Runs `fn` on the learner's own open attempt inside a transaction (row locked)
async function withOpenAttempt(userId, attemptId, fn) {
  const client = await pool.connect();
  let attempt;
  let step;
  let questions;
  let result;
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT * FROM quiz_attempts WHERE attempt_id = $1 AND user_id = $2 FOR UPDATE`,
      [attemptId, userId]
    );
    attempt = rows[0];
    if (!attempt) throw fail("NOT_FOUND");
    if (attempt.status !== "open") throw fail("ATTEMPT_CLOSED");

    step = await loadStep(client, attempt.mod_id, attempt.step_id);
    questions = (await ModuleService.getStepAssessment(attempt.step_id)) || [];
    if (!step || !orderMatches(attempt.question_order, questions)) {
      // The assessment was edited mid-attempt; this attempt can't be graded fairly
      await client.query(
        `UPDATE quiz_attempts SET status = 'expired', finished_at = NOW() WHERE attempt_id = $1`,
        [attempt.attempt_id]
      );
      await client.query("COMMIT");
      throw fail("ATTEMPT_CLOSED");
    }

    result = await fn(client, attempt, questions);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  return { attempt, step, questions, result };
}

class QuizAttemptService {
  // Starts a new attempt or resumes the open one (after a reload, closed tab, or step switch)
  async startOrResume(userId, modId, stepId, { isAdmin = false } = {}, retried = false) {
    const step = await loadStep(pool, modId, stepId);
    if (!step) throw fail("NOT_FOUND");
    if (!isAttemptStep(step)) throw fail("NOT_ATTEMPT_STEP");

    if (!isAdmin) {
      const mod = await ModuleService.getModuleById(modId);
      if (!mod || mod.status !== "published" || mod.moddateremove) throw fail("NOT_FOUND");
    }

    const enrolled = await pool.query(
      "SELECT 1 FROM module_activity WHERE user_id = $1 AND mod_id = $2 LIMIT 1",
      [userId, modId]
    );
    if (enrolled.rowCount === 0) throw fail("NOT_ENROLLED");

    const questions = (await ModuleService.getStepAssessment(stepId)) || [];
    const client = await pool.connect();
    let attempt;
    try {
      await client.query("BEGIN");
      const open = await client.query(
        `SELECT * FROM quiz_attempts WHERE user_id = $1 AND step_id = $2 AND status = 'open' FOR UPDATE`,
        [userId, stepId]
      );
      attempt = open.rows[0];

      const tooOld =
        attempt && Date.now() - new Date(attempt.started_at).getTime() > QUIZ_ATTEMPT_MAX_AGE_HOURS * 3600 * 1000;
      if (attempt && (tooOld || !orderMatches(attempt.question_order, questions))) {
        await client.query(
          `UPDATE quiz_attempts SET status = 'expired', finished_at = NOW() WHERE attempt_id = $1`,
          [attempt.attempt_id]
        );
        attempt = null;
      }

      if (!attempt) {
        const order = shuffle(questions).map((q) => ({
          questionId: q.question_id,
          optionIds: shuffle(q.options).map((o) => o.id),
        }));
        const created = await client.query(
          `INSERT INTO quiz_attempts (user_id, mod_id, step_id, question_order, question_deadline)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [userId, modId, stepId, JSON.stringify(order), order.length ? deadlineFromNow() : null]
        );
        attempt = created.rows[0];
      }

      await timeOutCurrentIfExpired(client, attempt);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      // Two tabs started at once: the other one created the open attempt, so resume it
      if (error.code === "23505" && !retried) {
        return this.startOrResume(userId, modId, stepId, { isAdmin }, true);
      }
      throw error;
    } finally {
      client.release();
    }

    return buildState(attempt, questions, step);
  }

  // Records the answer to the current question (first answer wins); reveals only its key
  async answer(userId, attemptId, questionId, selectedChoiceIds) {
    const { attempt, step, questions } = await withOpenAttempt(userId, attemptId, async (client, attempt) => {
      const current = attempt.question_order[attempt.current_index];
      if (!current || current.questionId !== Number(questionId)) throw fail("WRONG_QUESTION");

      const existing = await client.query(
        `SELECT 1 FROM quiz_attempt_answers WHERE attempt_id = $1 AND question_id = $2`,
        [attempt.attempt_id, current.questionId]
      );
      if (existing.rowCount > 0) throw fail("ALREADY_ANSWERED");

      // Answers arriving after the deadline (plus network grace) count as unanswered
      const late = pastGrace(attempt.question_deadline);
      const allowed = new Set(current.optionIds);
      const picked = late
        ? []
        : [...new Set((Array.isArray(selectedChoiceIds) ? selectedChoiceIds : []).map(Number))].filter((id) =>
            allowed.has(id)
          );

      await client.query(
        `INSERT INTO quiz_attempt_answers (attempt_id, question_id, selected_choice_ids, timed_out)
         VALUES ($1, $2, $3, $4)`,
        [attempt.attempt_id, current.questionId, picked, late]
      );
    });
    return buildState(attempt, questions, step);
  }

  // Moves to the next question and starts its clock; `fromIndex` makes double-clicks harmless
  async next(userId, attemptId, fromIndex) {
    const { attempt, step, questions } = await withOpenAttempt(userId, attemptId, async (client, attempt) => {
      if (Number.isInteger(fromIndex) && fromIndex !== attempt.current_index) return;

      await timeOutCurrentIfExpired(client, attempt);
      const current = attempt.question_order[attempt.current_index];
      const answered = await client.query(
        `SELECT 1 FROM quiz_attempt_answers WHERE attempt_id = $1 AND question_id = $2`,
        [attempt.attempt_id, current?.questionId]
      );
      if (answered.rowCount === 0) throw fail("NOT_ANSWERED");
      if (attempt.current_index >= attempt.question_order.length - 1) throw fail("NO_NEXT_QUESTION");

      const deadline = deadlineFromNow();
      await client.query(
        `UPDATE quiz_attempts SET current_index = current_index + 1, question_deadline = $2 WHERE attempt_id = $1`,
        [attempt.attempt_id, deadline]
      );
      attempt.current_index += 1;
      attempt.question_deadline = deadline;
    });
    return buildState(attempt, questions, step);
  }

  // Leaving the browser tab mid-attempt; reaching the limit locks (voids) the attempt
  async reportTabSwitch(userId, attemptId) {
    const { attempt, step, questions } = await withOpenAttempt(userId, attemptId, async (client, attempt) => {
      const count = attempt.tab_switch_count + 1;
      const locked = count >= QUIZ_TAB_SWITCH_LIMIT;
      await client.query(
        `UPDATE quiz_attempts
         SET tab_switch_count = $2,
             status = CASE WHEN $3 THEN 'locked' ELSE status END,
             finished_at = CASE WHEN $3 THEN NOW() ELSE finished_at END
         WHERE attempt_id = $1`,
        [attempt.attempt_id, count, locked]
      );
      attempt.tab_switch_count = count;
      if (locked) attempt.status = "locked";
    });
    return buildState(attempt, questions, step);
  }

  // Grades the recorded answers through the normal completion pipeline (results, certificates)
  async submit(userId, attemptId) {
    const { result: claim } = await withOpenAttempt(userId, attemptId, async (client, attempt) => {
      await timeOutCurrentIfExpired(client, attempt);
      const { rows } = await client.query(
        `SELECT question_id, selected_choice_ids FROM quiz_attempt_answers WHERE attempt_id = $1`,
        [attempt.attempt_id]
      );
      const order = attempt.question_order;
      const last = order[order.length - 1];
      const answeredIds = new Set(rows.map((r) => r.question_id));
      if (order.length && (attempt.current_index !== order.length - 1 || !answeredIds.has(last.questionId))) {
        throw fail("NOT_FINISHED");
      }

      // Claim the attempt first so a double submit can't grade it twice
      await client.query(
        `UPDATE quiz_attempts SET status = 'submitted', finished_at = NOW() WHERE attempt_id = $1`,
        [attempt.attempt_id]
      );
      return {
        modId: attempt.mod_id,
        stepId: attempt.step_id,
        answers: rows.map((r) => ({ questionId: r.question_id, selectedChoiceIds: r.selected_choice_ids })),
      };
    });

    try {
      return await ModuleProgressService.completeModuleStep(userId, claim.modId, claim.stepId, claim.answers, {
        viaAttempt: true,
      });
    } catch (error) {
      // Grading failed: reopen so the learner can submit again
      await pool
        .query(`UPDATE quiz_attempts SET status = 'open', finished_at = NULL WHERE attempt_id = $1`, [attemptId])
        .catch(() => {});
      throw error;
    }
  }
}

module.exports = new QuizAttemptService();
module.exports.isAttemptStep = isAttemptStep;
