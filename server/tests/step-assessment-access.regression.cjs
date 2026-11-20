/**
 * Regression test: GET /api/modules/steps/:stepId/assessment is limited to admins and to
 * learners enrolled in a module version they may access (ModuleService.canLearnerAccessModule).
 *
 *   - learner not enrolled in a published module -> 404
 *   - learner and a draft module (with or without a stray enrollment row) -> 404
 *   - learner enrolled in a published module -> 200, with today's data: the answer key on a
 *     non-final quiz step (the offline grader needs it) and none on the final assessment
 *   - learner enrolled in an archived version -> 200
 *   - admin -> 200 on a draft, with the answer key on the final assessment (previews)
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Fixtures are seeded directly into the
 * database from server/.env and removed by exact ID in `finally`. Refuses to run unless the
 * database is on a loopback address.
 *
 * Run from the repo root:  node server/tests/step-assessment-access.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "step-assessment-access-regression/1.0";
const RUN = `regress_sa_${crypto.randomBytes(4).toString("hex")}`;
const created = { userIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role = "resident") {
  const id = `${RUN}_${label}`;
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

// A practice quiz (graded, not final) and a final assessment, one question each.
async function createModule(label, status) {
  const mod = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'Fundamentals', 'Step-assessment regression fixture', 'Beginner', '5 mins', $2) RETURNING mod_id`,
    [`${RUN}_${label}`, status]
  );
  const modId = mod.rows[0].mod_id;
  created.modIds.push(modId);
  const level = await pool.query(
    `INSERT INTO levels (mod_id, level_order, level_title, passing_threshold, is_locked_by_default)
     VALUES ($1, 1, 'Regression Level', 80, false) RETURNING level_id`,
    [modId]
  );
  const steps = {};
  for (const [key, order, isFinal] of [["practice", 1, false], ["final", 2, true]]) {
    const step = await pool.query(
      `INSERT INTO module_steps (level_id, step_order, step_title, step_type, is_final_assessment)
       VALUES ($1, $2, $3, 'quiz', $4) RETURNING step_id`,
      [level.rows[0].level_id, order, `Regression ${key}`, isFinal]
    );
    const stepId = step.rows[0].step_id;
    const q = await pool.query(
      `INSERT INTO questions (mod_id, step_id, question_text, points, image_url)
       VALUES ($1, $2, 'Regression Q', 10, '') RETURNING question_id`,
      [modId, stepId]
    );
    await pool.query(
      `INSERT INTO choices (question_id, choice_text, is_correct, rationale)
       VALUES ($1, 'right', true, 'because'), ($1, 'wrong', false, 'not this')`,
      [q.rows[0].question_id]
    );
    steps[key] = stepId;
  }
  return { modId, ...steps };
}

const enroll = (user, mod) =>
  pool.query("INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, 'In Progress', 0)", [user.id, mod.modId]);

async function assessment(user, stepId) {
  const res = await fetch(`${BASE_URL}/api/modules/steps/${stepId}/assessment`, {
    headers: { Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const hasAnswerKey = (body) => (body.data || []).some((q) => (q.options || []).some((o) => "isCorrect" in o));

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

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
       (SELECT COUNT(*)::int FROM module_activity WHERE user_id = ANY($1)) AS enrollments`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const learner = await createUser("learner");
  const outsider = await createUser("outsider");
  const admin = await createUser("admin", "mdrrmo_admin");

  const published = await createModule("published", "published");
  await enroll(learner, published);
  const archived = await createModule("archived", "published");
  await enroll(learner, archived);
  await pool.query("UPDATE module_data SET status = 'archived' WHERE mod_id = $1", [archived.modId]);
  const draft = await createModule("draft", "draft");
  await enroll(learner, draft); // stray row: drafts must stay hidden anyway

  await check("not enrolled in a published module -> 404", async () => {
    assert.equal((await assessment(outsider, published.practice)).status, 404);
    assert.equal((await assessment(outsider, published.final)).status, 404);
  });
  await check("draft module -> 404 for learners, enrolled row or not", async () => {
    assert.equal((await assessment(outsider, draft.practice)).status, 404);
    assert.equal((await assessment(learner, draft.practice)).status, 404);
  });
  await check("enrolled in a published module -> 200 with today's data", async () => {
    const practice = await assessment(learner, published.practice);
    assert.equal(practice.status, 200);
    assert.equal(practice.body.data.length, 1);
    assert.ok(hasAnswerKey(practice.body), "practice quiz lost the answer key the offline grader uses");
    const final = await assessment(learner, published.final);
    assert.equal(final.status, 200);
    assert.ok(!hasAnswerKey(final.body), "final assessment exposed its answer key");
  });
  await check("enrolled in an archived version -> 200", async () => {
    assert.equal((await assessment(learner, archived.practice)).status, 200);
  });
  await check("admin -> 200 on a draft, with the final assessment's answer key", async () => {
    const res = await assessment(admin, draft.final);
    assert.equal(res.status, 200);
    assert.ok(hasAnswerKey(res.body), "admin preview lost the answer key");
  });
}

main()
  .catch((err) => {
    console.error("setup error:", err.message);
    results.push(false);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("cleanup failed:", err.message);
      results.push(false);
    }
    await pool.end();
    const failed = results.filter((ok) => !ok).length;
    console.log(failed ? `FAILED: ${failed} check(s) failed` : "All step-assessment access checks passed.");
    process.exit(failed ? 1 : 0);
  });
