/**
 * Regression test (M2 leftover): the two graders disagreed.
 *   ModuleProgressService.completeModuleStep scores every graded step, final attempts included
 *   (QuizAttemptService.submit calls it with viaAttempt). QuizAttemptService.isAnswerCorrect decides
 *   the right/wrong a learner sees for each answered question of a final attempt.
 *
 * Rule 1: a stored single-answer question with no correct option can't be answered correctly, so it
 *   scores 0 in both. ModuleProgressService compared null with null and gave the points for
 *   "nothing selected", while the attempt showed the answer as wrong.
 * Rule 2 (found by variant analysis): a legacy hazard_identification STEP (no stored interaction
 *   type) is multi-select in both. ModuleProgressService looked only at the question's
 *   interaction_type, graded a one-hazard question by the first choice picked, and passed
 *   "right hazard + a wrong one", which the attempt showed as wrong.
 * Unchanged and checked: a hazard question with no required hazard is right with nothing selected
 *   (the validator allows exactly that), and the plain right answers still score.
 *
 * Runs both services in-process. Each case is a published one-step module (one 10-point question);
 * the non-final copy goes through completeModuleStep, the final copy through a full attempt.
 * Fixtures are seeded from server/.env and deleted by exact id. Refuses to run unless the database
 * is on loopback, and refuses LMS_db.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> node server/tests/grader-agreement.regression.cjs
 */
const crypto = require("crypto");

const { transporter } = require("../utils/mailer");
transporter.sendMail = async () => ({ stubbed: true });

const pool = require("../config/db");
const ModuleProgressService = require("../services/modules/ModuleProgressService");
const QuizAttemptService = require("../services/modules/QuizAttemptService");

const RUN = `regress_grade_${crypto.randomBytes(4).toString("hex")}`;
const created = { userIds: [], modIds: [] };
let passed = 0;
let failed = 0;

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

let userCount = 0;
async function createLearner() {
  const id = `${RUN}_u${++userCount}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, 'resident', false, false, false, NOW(), NOW())`,
    [id, `Regression ${id}`, `${id}@example.invalid`]
  );
  created.userIds.push(id);
  return id;
}

// One published module, one level, one step, one 10-point question. choices: [{ text, correct }]
let modCount = 0;
async function createModule({ stepType, final, interactionType = null, choices }) {
  const mod = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'General', 'Grader agreement fixture', 'Beginner', '5 mins', 'published') RETURNING mod_id`,
    [`${RUN} m${++modCount}`]
  );
  const modId = mod.rows[0].mod_id;
  created.modIds.push(modId);
  const level = await pool.query(
    `INSERT INTO levels (mod_id, level_order, level_title, passing_threshold, is_locked_by_default)
     VALUES ($1, 1, 'Level', 80, false) RETURNING level_id`,
    [modId]
  );
  const step = await pool.query(
    `INSERT INTO module_steps (level_id, step_order, step_title, step_type, is_final_assessment)
     VALUES ($1, 1, 'Assessment', $2, $3) RETURNING step_id`,
    [level.rows[0].level_id, stepType, final]
  );
  const stepId = step.rows[0].step_id;
  const q = await pool.query(
    `INSERT INTO questions (mod_id, step_id, question_text, points, image_url, interaction_type)
     VALUES ($1, $2, 'Question', 10, '', $3) RETURNING question_id`,
    [modId, stepId, interactionType]
  );
  const questionId = q.rows[0].question_id;
  const ids = {};
  for (const c of choices) {
    const r = await pool.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, rationale) VALUES ($1, $2, $3, '') RETURNING choice_id`,
      [questionId, c.text, c.correct]
    );
    ids[c.text] = r.rows[0].choice_id;
  }
  return { modId, stepId, questionId, ids };
}

const enroll = (userId, modId) =>
  pool.query("INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, 'In Progress', 0)", [userId, modId]);

// The non-final path: the step's answers go straight to completeModuleStep
async function gradeStep(spec, pick) {
  const m = await createModule({ ...spec, final: false });
  const user = await createLearner();
  await enroll(user, m.modId);
  const result = await ModuleProgressService.completeModuleStep(user, m.modId, m.stepId, [
    { questionId: m.questionId, selectedChoiceIds: pick.map((t) => m.ids[t]) },
  ]);
  return result.score;
}

// The final path: a recorded attempt; returns the right/wrong shown and the submitted score
async function gradeAttempt(spec, pick) {
  const m = await createModule({ ...spec, final: true });
  const user = await createLearner();
  await enroll(user, m.modId);
  const started = await QuizAttemptService.startOrResume(user, m.modId, m.stepId);
  const state = await QuizAttemptService.answer(user, started.attemptId, m.questionId, pick.map((t) => m.ids[t]));
  const shown = state.questions[0].answer.correct;
  const result = await QuizAttemptService.submit(user, started.attemptId);
  return { shown, score: result.score };
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`not ok - ${name}\n  ${err.message}`);
  }
}

// Both graders must give `points` (0 or 10); the attempt must also show `points > 0` as right/wrong
async function agree(spec, pick, points) {
  const stepScore = await gradeStep(spec, pick);
  const attempt = await gradeAttempt(spec, pick);
  const problems = [];
  if (stepScore !== points) problems.push(`step grader scored ${stepScore}, expected ${points}`);
  if (attempt.score !== points) problems.push(`final attempt scored ${attempt.score}, expected ${points}`);
  if (attempt.shown !== points > 0) problems.push(`final attempt showed the answer as ${attempt.shown ? "right" : "wrong"}`);
  if (problems.length) throw new Error(problems.join("; "));
}

const NO_CORRECT = { stepType: "quiz", choices: [{ text: "A", correct: false }, { text: "B", correct: false }] };
const LEGACY_HAZARD = { stepType: "hazard_identification", choices: [{ text: "Wire", correct: true }, { text: "Sky", correct: false }] };
const HAZARD_NONE_REQUIRED = {
  stepType: "situational",
  interactionType: "hazard_identification",
  choices: [{ text: "Sky", correct: false }, { text: "Cloud", correct: false }],
};
const PLAIN = { stepType: "quiz", choices: [{ text: "Right", correct: true }, { text: "Wrong", correct: false }] };

async function main() {
  await assertScratchDatabase();

  await test("single answer, no correct option, nothing selected -> 0 in both", () => agree(NO_CORRECT, [], 0));
  await test("single answer, no correct option, one selected -> 0 in both", () => agree(NO_CORRECT, ["A"], 0));
  await test("legacy hazard step, right hazard plus a wrong one -> 0 in both", () => agree(LEGACY_HAZARD, ["Wire", "Sky"], 0));
  await test("legacy hazard step, just the right hazard -> 10 in both", () => agree(LEGACY_HAZARD, ["Wire"], 10));
  await test("hazard question with none required, nothing selected -> 10 in both (unchanged)", () => agree(HAZARD_NONE_REQUIRED, [], 10));
  await test("plain quiz, right answer -> 10 in both (unchanged)", () => agree(PLAIN, ["Right"], 10));
  await test("plain quiz, nothing selected -> 0 in both (unchanged)", () => agree(PLAIN, [], 0));
}

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM quiz_attempts WHERE user_id = ANY($1) OR mod_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM certificates WHERE user_id = ANY($1) OR module_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM results WHERE user_id = ANY($1) OR mod_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM user_step_progress WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM module_activity WHERE user_id = ANY($1) OR mod_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM user_notification WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM choices WHERE question_id IN (SELECT question_id FROM questions WHERE mod_id = ANY($1))", [modIds]);
    await client.query("DELETE FROM questions WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM module_steps WHERE level_id IN (SELECT level_id FROM levels WHERE mod_id = ANY($1))", [modIds]);
    await client.query("DELETE FROM levels WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1)", [modIds]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    failed++;
    console.error("FAIL:", err.stack);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("CLEANUP FAILED:", err.message);
      failed++;
    }
    await pool.end();
    console.log(`${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
