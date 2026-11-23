/**
 * Regression test for audit P4-02: a learner may start (and submit) a final assessment only
 * when every earlier step of that module version is recorded as complete on the server.
 *
 *   a) no lessons done: start is 409 LESSONS_INCOMPLETE listing the remaining step ids, and
 *      no attempt is created; with one lesson done only the other is listed
 *   b) all lessons done (completed through /complete, as the offline queue replays them):
 *      start works, passing issues the certificate as before
 *   c) an earlier step in a previous level counts; steps after the final don't
 *   d) archived version the learner is enrolled in (ADR 0005): blocked without the
 *      lessons, works with them
 *   e) submit re-checks: an attempt started with the lessons done can't be submitted once a
 *      lesson's progress row is gone; the attempt stays open and nothing is graded
 *   f) admins are unaffected (start works without the lessons)
 *   g) not enrolled still gets 403 NOT_ENROLLED, not the lesson list
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Fixtures are seeded directly into the
 * database from server/.env (or DB_DATABASE) and removed by exact ID in `finally`. Refuses to
 * run unless the database is on a loopback address.
 *
 * Run from the repo root:  node server/tests/final-assessment-gating.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "final-assessment-gating-regression/1.0";
const RUN = `regress_fg_${crypto.randomBytes(4).toString("hex")}`;
const created = { userIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing to seed a non-local database (${addr}).`);
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

// `levels` is a list of step lists; each step is "lesson" or "final". Fundamentals, so no
// prerequisites apply. Returns the step ids in order plus the final's correct choice.
async function createModule(label, levels, status = "published") {
  const mod = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'Fundamentals', 'Final-assessment gating regression fixture', 'Beginner', '5 mins', $2) RETURNING mod_id`,
    [`${RUN}_${label}`, status]
  );
  const modId = mod.rows[0].mod_id;
  created.modIds.push(modId);
  const out = { modId, lessonIds: [], finalId: null, correct: null, stepIds: [] };
  for (const [li, steps] of levels.entries()) {
    const level = await pool.query(
      `INSERT INTO levels (mod_id, level_order, level_title, passing_threshold, is_locked_by_default)
       VALUES ($1, $2, $3, 80, false) RETURNING level_id`,
      [modId, li + 1, `Regression Level ${li + 1}`]
    );
    for (const [si, kind] of steps.entries()) {
      const isFinal = kind === "final";
      const step = await pool.query(
        `INSERT INTO module_steps (level_id, step_order, step_title, step_type, step_content, is_final_assessment)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING step_id`,
        [level.rows[0].level_id, si + 1, `${kind} ${li + 1}.${si + 1}`, isFinal ? "quiz" : "lesson", isFinal ? null : "<p>Read.</p>", isFinal]
      );
      const stepId = step.rows[0].step_id;
      out.stepIds.push(stepId);
      if (!isFinal) {
        out.lessonIds.push(stepId);
        continue;
      }
      out.finalId = stepId;
      const q = await pool.query(
        `INSERT INTO questions (mod_id, step_id, question_text, points, image_url)
         VALUES ($1, $2, 'Regression Q', 10, '') RETURNING question_id`,
        [modId, stepId]
      );
      const choices = await pool.query(
        `INSERT INTO choices (question_id, choice_text, is_correct, rationale)
         VALUES ($1, 'right', true, 'because'), ($1, 'wrong', false, 'not this') RETURNING choice_id, is_correct`,
        [q.rows[0].question_id]
      );
      out.correct = choices.rows.find((c) => c.is_correct).choice_id;
    }
  }
  return out;
}

const enroll = (user, mod) =>
  pool.query("INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, 'In Progress', 0)", [user.id, mod.modId]);

async function api(user, method, path, body) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// The same request the offline queue replays for MARK_STEP_COMPLETE
const completeLesson = (user, mod, stepId) =>
  api(user, "POST", `/modules/${mod.modId}/steps/${stepId}/complete`, { answers: null });
const start = (user, mod) => api(user, "POST", `/modules/${mod.modId}/steps/${mod.finalId}/attempts`);
const attemptCount = async (user) =>
  (await pool.query("SELECT COUNT(*)::int n FROM quiz_attempts WHERE user_id = $1", [user.id])).rows[0].n;

// Answers every question correctly; returns the submit response
async function answerAll(user, mod, state) {
  for (let i = 0; i < state.total; i += 1) {
    const qid = state.questions[state.currentIndex].question_id;
    state = (await api(user, "POST", `/modules/attempts/${state.attemptId}/answers`, { questionId: qid, selectedChoiceIds: [mod.correct] })).body.data;
    if (i < state.total - 1) state = (await api(user, "POST", `/modules/attempts/${state.attemptId}/next`, { fromIndex: i })).body.data;
  }
  return state;
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`ok - ${name}`);
  } catch (err) {
    results.push(false);
    console.log(`not ok - ${name}: ${err.message.split("\n")[0]}`);
  }
}

const sorted = (ids) => [...ids].map(Number).sort((a, b) => a - b);

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
       (SELECT COUNT(*)::int FROM module_activity WHERE user_id = ANY($1)) AS enrollments,
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

  // a) + b): two lessons, then the final
  const modA = await createModule("basic", [["lesson", "lesson", "final"]]);
  const skipper = await createUser("skipper");
  await enroll(skipper, modA);

  const blocked = await start(skipper, modA);
  await check("a) no lessons done: start is 409 LESSONS_INCOMPLETE with the remaining step ids", async () => {
    assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
    assert.equal(blocked.body.error, "LESSONS_INCOMPLETE");
    assert.deepEqual(sorted(blocked.body.remainingStepIds || []), sorted(modA.lessonIds));
    assert.equal(typeof blocked.body.message, "string");
  });
  await check("a) no attempt row is created while blocked", async () => {
    assert.equal(await attemptCount(skipper), 0);
  });

  await completeLesson(skipper, modA, modA.lessonIds[0]);
  const partial = await start(skipper, modA);
  await check("a) one lesson done: only the other lesson is listed", async () => {
    assert.equal(partial.status, 409, JSON.stringify(partial.body));
    assert.equal(partial.body.error, "LESSONS_INCOMPLETE");
    assert.deepEqual(sorted(partial.body.remainingStepIds || []), [modA.lessonIds[1]]);
  });

  const learner = await createUser("learner");
  await enroll(learner, modA);
  for (const id of modA.lessonIds) {
    const res = await completeLesson(learner, modA, id);
    assert.equal(res.status, 200, `lesson completion: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const ok = await start(learner, modA);
  await check("b) all lessons done: start works", async () => {
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.data.status, "open");
  });
  if (ok.status === 200) {
    const state = await answerAll(learner, modA, ok.body.data);
    const submitted = await api(learner, "POST", `/modules/attempts/${state.attemptId}/submit`);
    const certs = await pool.query("SELECT status FROM certificates WHERE user_id = $1 AND module_id = $2", [learner.id, modA.modId]);
    await check("b) passing issues the certificate as before", async () => {
      assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
      assert.equal(submitted.body.passed, true);
      assert.equal(submitted.body.moduleCompleted, true);
      assert.equal(certs.rowCount, 1);
      assert.equal(certs.rows[0].status, "active");
    });
  }

  // c) earlier level counts; a step after the final doesn't
  const modC = await createModule("levels", [["lesson"], ["final", "lesson"]]);
  const crossLevel = await createUser("crosslevel");
  await enroll(crossLevel, modC);
  const cBlocked = await start(crossLevel, modC);
  await check("c) a lesson in an earlier level blocks the final", async () => {
    assert.equal(cBlocked.status, 409, JSON.stringify(cBlocked.body));
    assert.deepEqual(sorted(cBlocked.body.remainingStepIds || []), [modC.lessonIds[0]]);
  });
  await completeLesson(crossLevel, modC, modC.lessonIds[0]);
  const cOk = await start(crossLevel, modC);
  await check("c) a lesson after the final isn't required to start it", async () => {
    assert.equal(cOk.status, 200, JSON.stringify(cOk.body));
  });

  // d) archived version (ADR 0005)
  const modD = await createModule("archived", [["lesson", "final"]]);
  const archivedDone = await createUser("archiveddone");
  const archivedSkip = await createUser("archivedskip");
  await enroll(archivedDone, modD);
  await enroll(archivedSkip, modD);
  await completeLesson(archivedDone, modD, modD.lessonIds[0]);
  await pool.query("UPDATE module_data SET status = 'archived' WHERE mod_id = $1", [modD.modId]);
  const dBlocked = await start(archivedSkip, modD);
  await check("d) archived version without the lesson: 409 LESSONS_INCOMPLETE", async () => {
    assert.equal(dBlocked.status, 409, JSON.stringify(dBlocked.body));
    assert.equal(dBlocked.body.error, "LESSONS_INCOMPLETE");
  });
  const dOk = await start(archivedDone, modD);
  await check("d) archived version with the lesson done: start works", async () => {
    assert.equal(dOk.status, 200, JSON.stringify(dOk.body));
  });
  if (dOk.status === 200) {
    const state = await answerAll(archivedDone, modD, dOk.body.data);
    const submitted = await api(archivedDone, "POST", `/modules/attempts/${state.attemptId}/submit`);
    const certs = await pool.query("SELECT 1 FROM certificates WHERE user_id = $1 AND module_id = $2", [archivedDone.id, modD.modId]);
    await check("d) archived version: passing issues the certificate", async () => {
      assert.equal(submitted.status, 200, JSON.stringify(submitted.body));
      assert.equal(submitted.body.passed, true);
      assert.equal(certs.rowCount, 1);
    });
  }

  // e) submit re-checks
  const modE = await createModule("submit", [["lesson", "final"]]);
  const removed = await createUser("removed");
  await enroll(removed, modE);
  await completeLesson(removed, modE, modE.lessonIds[0]);
  const eStart = await start(removed, modE);
  assert.equal(eStart.status, 200, `submit case start: ${eStart.status} ${JSON.stringify(eStart.body)}`);
  const eState = await answerAll(removed, modE, eStart.body.data);
  await pool.query("DELETE FROM user_step_progress WHERE user_id = $1 AND step_id = $2", [removed.id, modE.lessonIds[0]]);
  const eSubmit = await api(removed, "POST", `/modules/attempts/${eState.attemptId}/submit`);
  const eAttempt = await pool.query("SELECT status FROM quiz_attempts WHERE attempt_id = $1", [eState.attemptId]);
  const eResults = await pool.query("SELECT COUNT(*)::int n FROM results WHERE user_id = $1", [removed.id]);
  await check("e) submit after a lesson's progress is gone: 409 LESSONS_INCOMPLETE, attempt stays open, not graded", async () => {
    assert.equal(eSubmit.status, 409, JSON.stringify(eSubmit.body));
    assert.equal(eSubmit.body.error, "LESSONS_INCOMPLETE");
    assert.deepEqual(sorted(eSubmit.body.remainingStepIds || []), [modE.lessonIds[0]]);
    assert.equal(eAttempt.rows[0].status, "open");
    assert.equal(eResults.rows[0].n, 0);
  });
  await completeLesson(removed, modE, modE.lessonIds[0]);
  const eRetry = await api(removed, "POST", `/modules/attempts/${eState.attemptId}/submit`);
  await check("e) once the lesson is complete again the same attempt submits", async () => {
    assert.equal(eRetry.status, 200, JSON.stringify(eRetry.body));
    assert.equal(eRetry.body.passed, true);
  });

  // f) admins unaffected
  const admin = await createUser("admin", "mdrrmo_admin");
  await enroll(admin, modA);
  const fStart = await start(admin, modA);
  await check("f) admin starts without the lessons", async () => {
    assert.equal(fStart.status, 200, JSON.stringify(fStart.body));
  });
  if (fStart.status === 200) {
    const state = await answerAll(admin, modA, fStart.body.data);
    const fSubmit = await api(admin, "POST", `/modules/attempts/${state.attemptId}/submit`);
    await check("f) admin submits without the lessons", async () => {
      assert.equal(fSubmit.status, 200, JSON.stringify(fSubmit.body));
    });
  }

  // g) enrollment is checked before lessons
  const outsider = await createUser("outsider");
  const gStart = await start(outsider, modA);
  await check("g) not enrolled: 403 NOT_ENROLLED, no lesson list", async () => {
    assert.equal(gStart.status, 403, JSON.stringify(gStart.body));
    assert.equal(gStart.body.error, "NOT_ENROLLED");
    assert.equal(gStart.body.remainingStepIds, undefined);
  });
}

main()
  .catch((err) => {
    results.push(false);
    console.error("FAIL:", err.message);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      results.push(false);
      console.error("cleanup failed:", err.message);
    }
    await pool.end();
    const failed = results.filter((r) => !r).length;
    console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
    process.exitCode = failed ? 1 : 0;
  });
