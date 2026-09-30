/**
 * Regression test for audit finding H1: quiz-score forgery in
 * ModuleProgressService.completeModuleStep (duplicate / unknown question entries).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts:
 *   (a) the correct answer for one question submitted 5 times -> fails at 10/20
 *   (b) an unknown questionId with selectedChoiceIds: []        -> fails at 0/20
 *   (c) a legitimate all-correct submission                     -> passes at 20/20
 *
 * Fixtures (users, a draft quiz module, enrollments, sessions) are seeded directly
 * into the database from server/.env and removed by exact ID in `finally`.
 * Sessions are inserted directly instead of signing in, so no emails are sent.
 * Refuses to run unless the database server is on a loopback address.
 *
 * Run from the repo root:  node server/tests/h1-quiz-scoring.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "h1-regression/1.0";
const RUN = `regress_h1_${crypto.randomBytes(4).toString("hex")}`;

const created = { userIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createResident(label) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, 'resident', false, false, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@regression.invalid`]
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

async function createQuizModule() {
  const mod = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'General', 'H1 regression fixture', 'Beginner', '5 mins', 'draft') RETURNING mod_id`,
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
     VALUES ($1, 1, 'Regression Quiz', 'quiz', true) RETURNING step_id`,
    [level.rows[0].level_id]
  );
  const stepId = step.rows[0].step_id;

  const questions = [];
  for (const n of [1, 2]) {
    const q = await pool.query(
      `INSERT INTO questions (mod_id, step_id, question_text, points, image_url)
       VALUES ($1, $2, $3, 10, '') RETURNING question_id`,
      [modId, stepId, `Regression Q${n}`]
    );
    const questionId = q.rows[0].question_id;
    const choices = await pool.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, rationale)
       VALUES ($1, 'right', true, ''), ($1, 'wrong', false, '') RETURNING choice_id, is_correct`,
      [questionId]
    );
    questions.push({ questionId, correct: choices.rows.find((c) => c.is_correct).choice_id });
  }
  return { modId, stepId, questions };
}

async function completeStep(user, mod, answers) {
  const res = await fetch(`${BASE_URL}/api/modules/${mod.modId}/steps/${mod.stepId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: JSON.stringify({ answers }),
  });
  return { status: res.status, body: await res.json() };
}

async function certificateCount(userId, modId) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM certificates WHERE user_id = $1 AND module_id = $2",
    [userId, modId]
  );
  return rows[0].n;
}

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
       (SELECT COUNT(*)::int FROM session WHERE "userId" = ANY($1)) AS sessions,
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2)) AS modules,
       (SELECT COUNT(*)::int FROM questions WHERE mod_id = ANY($2)) AS questions,
       (SELECT COUNT(*)::int FROM module_activity WHERE user_id = ANY($1)) AS enrollments,
       (SELECT COUNT(*)::int FROM results WHERE user_id = ANY($1)) AS results,
       (SELECT COUNT(*)::int FROM certificates WHERE user_id = ANY($1) OR module_id = ANY($2)) AS certificates,
       (SELECT COUNT(*)::int FROM activity_log WHERE user_id = ANY($1)) AS activity_log`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const mod = await createQuizModule();
  const [q1, q2] = mod.questions;
  const users = {};
  for (const label of ["a", "b", "c"]) {
    users[label] = await createResident(label);
    await pool.query(
      "INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, 'In Progress', 0)",
      [users[label].id, mod.modId]
    );
  }

  const cases = [
    {
      name: "(a) correct answer for one question submitted 5 times",
      user: users.a,
      answers: Array(5).fill({ questionId: q1.questionId, selectedChoiceIds: [q1.correct] }),
      expect: { passed: false, score: 10, totalPoints: 20, certificates: 0 },
    },
    {
      name: "(b) unknown questionId with empty selectedChoiceIds",
      user: users.b,
      answers: [{ questionId: 999999999, selectedChoiceIds: [] }],
      expect: { passed: false, score: 0, totalPoints: 20, certificates: 0 },
    },
    {
      name: "(c) legitimate all-correct submission",
      user: users.c,
      answers: [
        { questionId: q1.questionId, selectedChoiceIds: [q1.correct] },
        { questionId: q2.questionId, selectedChoiceIds: [q2.correct] },
      ],
      expect: { passed: true, score: 20, totalPoints: 20, certificates: 1, moduleCompleted: true },
    },
  ];

  for (const c of cases) {
    const { status, body } = await completeStep(c.user, mod, c.answers);
    const certificates = await certificateCount(c.user.id, mod.modId);
    console.log(`${c.name}: HTTP ${status} ${JSON.stringify(body)} certificates=${certificates}`);
    assert.equal(status, 200, `${c.name}: HTTP status`);
    assert.equal(body.passed, c.expect.passed, `${c.name}: passed`);
    assert.equal(body.score, c.expect.score, `${c.name}: score`);
    assert.equal(body.totalPoints, c.expect.totalPoints, `${c.name}: totalPoints`);
    assert.equal(certificates, c.expect.certificates, `${c.name}: certificates issued`);
    if (c.expect.moduleCompleted !== undefined) {
      assert.equal(body.moduleCompleted, c.expect.moduleCompleted, `${c.name}: moduleCompleted`);
    }
  }
}

main()
  .then(() => {
    console.log("PASS: H1 regression");
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error("FAIL:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("CLEANUP FAILED:", err.message);
      process.exitCode = 1;
    }
    await pool.end();
    process.exit(process.exitCode);
  });
