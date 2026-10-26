/**
 * Regression test for audit finding 3: the final-assessment answer key reached the client,
 * and final assessments were graded from answers the client sent.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that for a final assessment:
 *   - residents never receive the answer key (admins still do, for previews)
 *   - /complete refuses client-submitted answers (409 ATTEMPT_REQUIRED)
 *   - attempts resume with the same order, record the first answer only, reveal only the
 *     answered question's key, enforce the current question and its deadline, and are
 *     graded from the recorded answers alone
 *   - leaving the tab twice locks the attempt, and another user can't touch it
 *
 * Fixtures (users, a published module, enrollments, sessions) are seeded directly into the
 * database from server/.env and removed by exact ID in `finally`. Sessions are inserted
 * directly instead of signing in. Refuses to run unless the database is on loopback.
 *
 * Run from the repo root:  node server/tests/quiz-attempts.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "quiz-attempts-regression/1.0";
const RUN = `regress_qa_${crypto.randomBytes(4).toString("hex")}`;

const created = { userIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role = "resident") {
  const id = `${RUN}_${label}`;
  // Admin roles require MFA; the flag stands in for an enrolled second factor
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, $5, false, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, role, role !== "resident"]
  );
  created.userIds.push(id);

  const ctx = await auth.$context;
  const token = crypto.randomBytes(24).toString("hex");
  await pool.query(
    `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
     VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW(), NOW(), '127.0.0.1', $3, $4)`,
    [`${id}_session`, token, UA, id]
  );
  const signature = crypto.createHmac("sha256", ctx.secret).update(token).digest("base64");
  return { id, cookie: `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}` };
}

async function createFinalAssessmentModule() {
  const mod = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'General', 'Quiz attempts regression fixture', 'Beginner', '5 mins', 'published') RETURNING mod_id`,
    [RUN]
  );
  const modId = mod.rows[0].mod_id;
  created.modIds.push(modId);

  const level = await pool.query(
    `INSERT INTO levels (mod_id, level_order, level_title, passing_threshold, is_locked_by_default)
     VALUES ($1, 1, 'Regression Level', 80, false) RETURNING level_id`,
    [modId]
  );
  const step = await pool.query(
    `INSERT INTO module_steps (level_id, step_order, step_title, step_type, is_final_assessment)
     VALUES ($1, 1, 'Regression Final', 'quiz', true) RETURNING step_id`,
    [level.rows[0].level_id]
  );
  const stepId = step.rows[0].step_id;

  const questions = {};
  for (const n of [1, 2]) {
    const q = await pool.query(
      `INSERT INTO questions (mod_id, step_id, question_text, points, image_url)
       VALUES ($1, $2, $3, 10, '') RETURNING question_id`,
      [modId, stepId, `Regression Q${n}`]
    );
    const questionId = q.rows[0].question_id;
    const choices = await pool.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, rationale)
       VALUES ($1, 'right', true, 'because'), ($1, 'wrong', false, 'not this') RETURNING choice_id, is_correct`,
      [questionId]
    );
    questions[questionId] = {
      correct: choices.rows.find((c) => c.is_correct).choice_id,
      wrong: choices.rows.find((c) => !c.is_correct).choice_id,
    };
  }
  return { modId, stepId, questions };
}

async function enroll(user, modId) {
  await pool.query(
    "INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, 'In Progress', 0)",
    [user.id, modId]
  );
}

async function api(user, method, path, body) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const hasKey = (option) => ["isCorrect", "rationale", "sequenceOrder"].some((k) => k in option);
const currentQuestion = (state) => state.questions[state.currentIndex];

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
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM choices WHERE question_id IN (SELECT question_id FROM questions WHERE mod_id = ANY($1))", [modIds]);
    await client.query("DELETE FROM questions WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM module_steps WHERE level_id IN (SELECT level_id FROM levels WHERE mod_id = ANY($1))", [modIds]);
    await client.query("DELETE FROM levels WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1)", [modIds]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [userIds]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM "user" WHERE id = ANY($1)) AS users,
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2)) AS modules,
       (SELECT COUNT(*)::int FROM quiz_attempts WHERE user_id = ANY($1)) AS attempts,
       (SELECT COUNT(*)::int FROM results WHERE user_id = ANY($1)) AS results,
       (SELECT COUNT(*)::int FROM certificates WHERE user_id = ANY($1) OR module_id = ANY($2)) AS certificates`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const mod = await createFinalAssessmentModule();
  const a = await createUser("a");
  const b = await createUser("b");
  const admin = await createUser("admin", "mdrrmo_admin");
  await enroll(a, mod.modId);
  await enroll(b, mod.modId);
  const start = (user) => api(user, "POST", `/modules/${mod.modId}/steps/${mod.stepId}/attempts`);
  const check = (name, fn) => {
    fn();
    console.log(`ok - ${name}`);
  };

  // --- The answer key is not exposed --------------------------------------------------
  const resAssess = await api(a, "GET", `/modules/steps/${mod.stepId}/assessment`);
  check("resident assessment fetch has no answer key", () => {
    assert.equal(resAssess.status, 200);
    assert.ok(resAssess.body.data.every((q) => q.options.every((o) => !hasKey(o))));
  });
  const adminAssess = await api(admin, "GET", `/modules/steps/${mod.stepId}/assessment`);
  check("admin assessment fetch keeps the answer key", () => {
    assert.equal(adminAssess.status, 200);
    assert.ok(adminAssess.body.data.every((q) => q.options.some((o) => o.isCorrect === true)));
  });

  const allCorrect = Object.entries(mod.questions).map(([qid, c]) => ({ questionId: Number(qid), selectedChoiceIds: [c.correct] }));
  const legacy = await api(a, "POST", `/modules/${mod.modId}/steps/${mod.stepId}/complete`, { answers: allCorrect });
  const legacyResults = await pool.query("SELECT COUNT(*)::int n FROM results WHERE user_id = $1", [a.id]);
  check("/complete refuses client-graded answers for a final assessment", () => {
    assert.equal(legacy.status, 409);
    assert.equal(legacy.body.error, "ATTEMPT_REQUIRED");
    assert.equal(legacyResults.rows[0].n, 0);
  });

  // --- Start, resume, and per-question reveal ----------------------------------------
  const first = await start(a);
  const s1 = first.body.data;
  check("start returns an open attempt without the key", () => {
    assert.equal(first.status, 200);
    assert.equal(s1.status, "open");
    assert.equal(s1.total, 2);
    assert.ok(s1.questions.every((q) => q.answer === null && q.options.every((o) => !hasKey(o))));
    assert.ok(s1.remainingSeconds > 0 && s1.remainingSeconds <= s1.questionSeconds);
  });

  const resumed = (await start(a)).body.data;
  check("starting again resumes the same attempt and order", () => {
    assert.equal(resumed.attemptId, s1.attemptId);
    assert.deepEqual(resumed.questions.map((q) => q.question_id), s1.questions.map((q) => q.question_id));
    assert.deepEqual(resumed.questions[0].options.map((o) => o.id), s1.questions[0].options.map((o) => o.id));
  });

  const [firstQ, secondQ] = s1.questions.map((q) => q.question_id);
  const wrongQ = await api(a, "POST", `/modules/attempts/${s1.attemptId}/answers`, {
    questionId: secondQ,
    selectedChoiceIds: [mod.questions[secondQ].correct],
  });
  check("answering a question that isn't current is rejected", () => {
    assert.equal(wrongQ.status, 409);
    assert.equal(wrongQ.body.error, "WRONG_QUESTION");
  });

  const early = await api(a, "POST", `/modules/attempts/${s1.attemptId}/submit`);
  check("submitting before the last question is rejected", () => {
    assert.equal(early.status, 409);
    assert.equal(early.body.error, "NOT_FINISHED");
  });

  const answered = await api(a, "POST", `/modules/attempts/${s1.attemptId}/answers`, {
    questionId: firstQ,
    selectedChoiceIds: [mod.questions[firstQ].correct],
  });
  const afterFirst = answered.body.data;
  check("answering reveals only that question's key", () => {
    assert.equal(answered.status, 200);
    const q = currentQuestion(afterFirst);
    assert.equal(q.answer.correct, true);
    assert.ok(q.options.some((o) => o.isCorrect === true));
    assert.ok(afterFirst.questions[1].options.every((o) => !hasKey(o)));
  });

  const again = await api(a, "POST", `/modules/attempts/${s1.attemptId}/answers`, {
    questionId: firstQ,
    selectedChoiceIds: [mod.questions[firstQ].wrong],
  });
  check("the first answer wins (re-answering is rejected)", () => {
    assert.equal(again.status, 409);
    assert.equal(again.body.error, "ALREADY_ANSWERED");
  });

  const other = await api(b, "POST", `/modules/attempts/${s1.attemptId}/answers`, { questionId: firstQ, selectedChoiceIds: [] });
  check("another user can't act on the attempt", () => assert.equal(other.status, 404));

  const next = (await api(a, "POST", `/modules/attempts/${s1.attemptId}/next`, { fromIndex: 0 })).body.data;
  const doubleClick = (await api(a, "POST", `/modules/attempts/${s1.attemptId}/next`, { fromIndex: 0 })).body.data;
  check("next advances once even if clicked twice", () => {
    assert.equal(next.currentIndex, 1);
    assert.equal(doubleClick.currentIndex, 1);
  });

  // --- Deadline enforcement ------------------------------------------------------------
  await pool.query(
    "UPDATE quiz_attempts SET question_deadline = NOW() - INTERVAL '10 seconds' WHERE attempt_id = $1",
    [s1.attemptId]
  );
  const late = (await api(a, "POST", `/modules/attempts/${s1.attemptId}/answers`, {
    questionId: secondQ,
    selectedChoiceIds: [mod.questions[secondQ].correct],
  })).body.data;
  check("an answer after the deadline is recorded as unanswered", () => {
    const q = currentQuestion(late);
    assert.equal(q.answer.timedOut, true);
    assert.deepEqual(q.answer.selectedChoiceIds, []);
    assert.equal(q.answer.correct, false);
  });

  // --- Grading from recorded answers only ---------------------------------------------
  const graded = await api(a, "POST", `/modules/attempts/${s1.attemptId}/submit`, { answers: allCorrect });
  check("submit grades the recorded answers, ignoring the request body", () => {
    assert.equal(graded.status, 200);
    assert.equal(graded.body.passed, false);
    assert.equal(graded.body.score, 10);
    assert.equal(graded.body.totalPoints, 20);
  });

  const closed = await api(a, "POST", `/modules/attempts/${s1.attemptId}/answers`, { questionId: secondQ, selectedChoiceIds: [] });
  check("a submitted attempt is closed", () => assert.equal(closed.body.error, "ATTEMPT_CLOSED"));

  const fresh = (await start(a)).body.data;
  check("starting after a submit creates a fresh attempt", () => {
    assert.notEqual(fresh.attemptId, s1.attemptId);
    assert.equal(fresh.currentIndex, 0);
  });

  // --- Tab-switch lock -------------------------------------------------------------------
  await api(a, "POST", `/modules/attempts/${fresh.attemptId}/tab-switches`);
  const locked = (await api(a, "POST", `/modules/attempts/${fresh.attemptId}/tab-switches`)).body.data;
  const afterLock = await api(a, "POST", `/modules/attempts/${fresh.attemptId}/answers`, {
    questionId: currentQuestion(fresh).question_id,
    selectedChoiceIds: [],
  });
  const restarted = (await start(a)).body.data;
  check("two tab switches lock the attempt; restarting gives a new one", () => {
    assert.equal(locked.status, "locked");
    assert.equal(afterLock.body.error, "ATTEMPT_CLOSED");
    assert.notEqual(restarted.attemptId, fresh.attemptId);
    assert.equal(restarted.status, "open");
  });

  // --- A clean pass still issues the certificate ------------------------------------------
  let state = (await start(b)).body.data;
  for (let i = 0; i < state.total; i++) {
    const qid = currentQuestion(state).question_id;
    state = (await api(b, "POST", `/modules/attempts/${state.attemptId}/answers`, {
      questionId: qid,
      selectedChoiceIds: [mod.questions[qid].correct],
    })).body.data;
    if (i < state.total - 1) {
      state = (await api(b, "POST", `/modules/attempts/${state.attemptId}/next`, { fromIndex: i })).body.data;
    }
  }
  const pass = await api(b, "POST", `/modules/attempts/${state.attemptId}/submit`);
  const certs = await pool.query("SELECT COUNT(*)::int n FROM certificates WHERE user_id = $1 AND module_id = $2", [b.id, mod.modId]);
  check("a full correct attempt passes and issues the certificate", () => {
    assert.equal(pass.body.passed, true);
    assert.equal(pass.body.score, 20);
    assert.equal(pass.body.moduleCompleted, true);
    assert.equal(certs.rows[0].n, 1);
  });

  console.log("All quiz-attempt regression checks passed.");
}

main()
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("cleanup failed:", err.message);
      process.exitCode = 1;
    }
    await pool.end();
  });
