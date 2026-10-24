/**
 * Regression test for per-question explanations (questions.rationale) and stored situational
 * interaction types (questions.interaction_type, migration 12).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that:
 *   - a hazard question with a single required hazard stays multi-select when its type is stored,
 *     and selecting the hazard plus a wrong one is graded wrong (practice and final assessments)
 *   - residents never receive a final assessment's question explanation before answering it;
 *     admins still do, and practice assessments keep it (they already carry their answer key)
 *   - the explanation is revealed once the question is answered in an attempt
 *
 * Fixtures (users, a published module, enrollments, sessions) are seeded directly into the
 * database from server/.env and removed by exact ID in `finally`. Sessions are inserted
 * directly instead of signing in. Refuses to run unless the database is on loopback.
 *
 * Run from the repo root:  node server/tests/question-explanations.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "question-explanations-regression/1.0";
const RUN = `regress_qe_${crypto.randomBytes(4).toString("hex")}`;
const EXPLANATION = "Cut the power before touching anything wet.";

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

// One hazard question with a single required hazard, and one sequence question with an explanation
async function addSituationalQuestions(modId, stepId) {
  const hazard = await pool.query(
    `INSERT INTO questions (mod_id, step_id, question_text, points, image_url, interaction_type)
     VALUES ($1, $2, 'Spot the hazards', 10, '', 'hazard_identification') RETURNING question_id`,
    [modId, stepId]
  );
  const hazardId = hazard.rows[0].question_id;
  const hazardChoices = await pool.query(
    `INSERT INTO choices (question_id, choice_text, is_correct, rationale)
     VALUES ($1, 'Downed wire', true, 'live'), ($1, 'Tree', false, 'safe'), ($1, 'Sky', false, 'safe')
     RETURNING choice_id, is_correct`,
    [hazardId]
  );

  const sequence = await pool.query(
    `INSERT INTO questions (mod_id, step_id, question_text, points, image_url, interaction_type, rationale)
     VALUES ($1, $2, 'Order the steps', 10, '', 'action_sequence', $3) RETURNING question_id`,
    [modId, stepId, EXPLANATION]
  );
  const sequenceId = sequence.rows[0].question_id;
  const sequenceChoices = await pool.query(
    `INSERT INTO choices (question_id, choice_text, is_correct, rationale, sequence_order)
     VALUES ($1, 'Switch off power', true, NULL, 1), ($1, 'Mop the floor', true, NULL, 2)
     RETURNING choice_id, sequence_order`,
    [sequenceId]
  );

  return {
    hazardId,
    wire: hazardChoices.rows.find((c) => c.is_correct).choice_id,
    tree: hazardChoices.rows.find((c) => !c.is_correct).choice_id,
    sequenceId,
    sequenceOrder: sequenceChoices.rows.sort((x, y) => x.sequence_order - y.sequence_order).map((c) => c.choice_id),
  };
}

async function createModule() {
  const mod = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'General', 'Question explanations regression fixture', 'Beginner', '5 mins', 'published') RETURNING mod_id`,
    [RUN]
  );
  const modId = mod.rows[0].mod_id;
  created.modIds.push(modId);

  const level = await pool.query(
    `INSERT INTO levels (mod_id, level_order, level_title, passing_threshold, is_locked_by_default)
     VALUES ($1, 1, 'Regression Level', 80, false) RETURNING level_id`,
    [modId]
  );
  const levelId = level.rows[0].level_id;
  const practice = await pool.query(
    `INSERT INTO module_steps (level_id, step_order, step_title, step_type, is_final_assessment)
     VALUES ($1, 1, 'Regression Practice', 'situational', false) RETURNING step_id`,
    [levelId]
  );
  const final = await pool.query(
    `INSERT INTO module_steps (level_id, step_order, step_title, step_type, is_final_assessment)
     VALUES ($1, 2, 'Regression Final', 'situational', true) RETURNING step_id`,
    [levelId]
  );

  const practiceStepId = practice.rows[0].step_id;
  const finalStepId = final.rows[0].step_id;
  return {
    modId,
    practiceStepId,
    finalStepId,
    practice: await addSituationalQuestions(modId, practiceStepId),
    final: await addSituationalQuestions(modId, finalStepId),
  };
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
       (SELECT COUNT(*)::int FROM results WHERE user_id = ANY($1)) AS results`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const mod = await createModule();
  const a = await createUser("a");
  const b = await createUser("b");
  const admin = await createUser("admin", "mdrrmo_admin");
  await enroll(a, mod.modId);
  await enroll(b, mod.modId);
  const check = (name, fn) => {
    fn();
    console.log(`ok - ${name}`);
  };
  const byId = (questions, id) => questions.find((q) => q.question_id === id);

  // --- What each role receives --------------------------------------------------------
  const practiceView = await api(a, "GET", `/modules/steps/${mod.practiceStepId}/assessment`);
  check("practice assessment carries the stored type and explanation", () => {
    assert.equal(practiceView.status, 200);
    assert.equal(byId(practiceView.body.data, mod.practice.hazardId).interaction_type, "hazard_identification");
    assert.equal(byId(practiceView.body.data, mod.practice.sequenceId).rationale, EXPLANATION);
  });

  const finalView = await api(a, "GET", `/modules/steps/${mod.finalStepId}/assessment`);
  check("resident final assessment fetch has no explanation", () => {
    assert.equal(finalView.status, 200);
    assert.ok(finalView.body.data.every((q) => !("rationale" in q)));
    assert.equal(byId(finalView.body.data, mod.final.hazardId).interaction_type, "hazard_identification");
  });

  const adminView = await api(admin, "GET", `/modules/steps/${mod.finalStepId}/assessment`);
  check("admin final assessment fetch keeps the explanation", () => {
    assert.equal(adminView.status, 200);
    assert.equal(byId(adminView.body.data, mod.final.sequenceId).rationale, EXPLANATION);
  });

  // --- Practice grading: a single required hazard is still multi-select ----------------
  const p = mod.practice;
  const overSelected = await api(a, "POST", `/modules/${mod.modId}/steps/${mod.practiceStepId}/complete`, {
    answers: [
      { questionId: p.hazardId, selectedChoiceIds: [p.wire, p.tree] },
      { questionId: p.sequenceId, selectedChoiceIds: p.sequenceOrder },
    ],
  });
  check("practice: hazard plus a wrong pick is graded wrong", () => {
    assert.equal(overSelected.status, 200, JSON.stringify(overSelected.body));
    assert.equal(overSelected.body.score, 10);
  });

  const exact = await api(b, "POST", `/modules/${mod.modId}/steps/${mod.practiceStepId}/complete`, {
    answers: [
      { questionId: p.hazardId, selectedChoiceIds: [p.wire] },
      { questionId: p.sequenceId, selectedChoiceIds: p.sequenceOrder },
    ],
  });
  check("practice: exactly the required hazard is graded right", () => {
    assert.equal(exact.status, 200, JSON.stringify(exact.body));
    assert.equal(exact.body.score, 20);
  });

  // --- Final attempt: kind, hidden explanation, reveal, grading -------------------------
  const f = mod.final;
  let state = (await api(a, "POST", `/modules/${mod.modId}/steps/${mod.finalStepId}/attempts`)).body.data;
  check("attempt marks the hazard question multi-select and hides explanations", () => {
    assert.equal(byId(state.questions, f.hazardId).kind, "multi");
    assert.equal(byId(state.questions, f.sequenceId).kind, "sequence");
    assert.ok(state.questions.every((q) => q.rationale === null));
  });

  for (let i = 0; i < state.total; i++) {
    const current = state.questions[state.currentIndex];
    const picked = current.question_id === f.hazardId ? [f.wire, f.tree] : f.sequenceOrder;
    state = (await api(a, "POST", `/modules/attempts/${state.attemptId}/answers`, {
      questionId: current.question_id,
      selectedChoiceIds: picked,
    })).body.data;
    if (i < state.total - 1) {
      state = (await api(a, "POST", `/modules/attempts/${state.attemptId}/next`, { fromIndex: i })).body.data;
    }
  }
  check("attempt reveals the explanation once answered", () => {
    assert.equal(byId(state.questions, f.sequenceId).rationale, EXPLANATION);
  });
  check("attempt grades hazard plus a wrong pick as wrong", () => {
    assert.equal(byId(state.questions, f.hazardId).answer.correct, false);
    assert.equal(byId(state.questions, f.sequenceId).answer.correct, true);
  });

  const graded = await api(a, "POST", `/modules/attempts/${state.attemptId}/submit`);
  check("submitted attempt scores only the sequence question", () => {
    assert.equal(graded.status, 200, JSON.stringify(graded.body));
    assert.equal(graded.body.score, 10);
  });

  console.log("All question-explanation regression checks passed.");
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
