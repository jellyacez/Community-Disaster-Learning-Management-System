/**
 * Regression test: learners keep access to a module version they enrolled in after it is
 * archived (a newer version was published), and nobody else sees non-published modules.
 *
 *   a) enrolled, in progress, archived after enrollment: details and viewer 200, a lesson
 *      step completes, the final assessment starts and passes, a certificate is issued
 *   b) enrolled and completed, archived: details and viewer 200 (Review Module)
 *   c) not enrolled, archived: 404 on details, viewer, assessment start and enroll
 *   d) draft / pending_review: 404 for learners, even with a stray enrollment row
 *   e) published module: behaviour unchanged (enrolled 200s; not enrolled: details 200,
 *      viewer 403, enroll without a code 400)
 *   f) dashboard payload + the client's In Progress rule (client/src/utils/enrollmentFilters.js):
 *      archived versions with 0 < progress < 100 are in progress; an archived version at 0%
 *      with a newer published version stays hidden; completed and 0% archived are not;
 *      the dashboard completionRate counts the same archived versions (progress > 0)
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Fixtures (users, sessions, modules,
 * enrollments) are seeded directly into the database from server/.env and removed by exact
 * ID in `finally`. Refuses to run unless the database is on a loopback address.
 *
 * Run from the repo root:  node server/tests/archived-version-access.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const path = require("path");
const { pathToFileURL } = require("url");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "archived-version-access-regression/1.0";
const RUN = `regress_av_${crypto.randomBytes(4).toString("hex")}`;
const created = { userIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label) {
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

// A lesson step, then a one-question final assessment. Fundamentals, so no prerequisites apply.
async function createModule(label, status) {
  const mod = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status, enrollment_code)
     VALUES ($1, 'Fundamentals', 'Archived-version regression fixture', 'Beginner', '5 mins', $2, $3) RETURNING mod_id`,
    [`${RUN}_${label}`, status, crypto.randomBytes(3).toString("hex").toUpperCase()]
  );
  const modId = mod.rows[0].mod_id;
  created.modIds.push(modId);
  const level = await pool.query(
    `INSERT INTO levels (mod_id, level_order, level_title, passing_threshold, is_locked_by_default)
     VALUES ($1, 1, 'Regression Level', 80, false) RETURNING level_id`,
    [modId]
  );
  const levelId = level.rows[0].level_id;
  const lesson = await pool.query(
    `INSERT INTO module_steps (level_id, step_order, step_title, step_type, step_content, is_final_assessment)
     VALUES ($1, 1, 'Regression Lesson', 'lesson', '<p>Read this.</p>', false) RETURNING step_id`,
    [levelId]
  );
  const final = await pool.query(
    `INSERT INTO module_steps (level_id, step_order, step_title, step_type, is_final_assessment)
     VALUES ($1, 2, 'Regression Final', 'quiz', true) RETURNING step_id`,
    [levelId]
  );
  const q = await pool.query(
    `INSERT INTO questions (mod_id, step_id, question_text, points, image_url)
     VALUES ($1, $2, 'Regression Q', 10, '') RETURNING question_id`,
    [modId, final.rows[0].step_id]
  );
  const choices = await pool.query(
    `INSERT INTO choices (question_id, choice_text, is_correct, rationale)
     VALUES ($1, 'right', true, 'because'), ($1, 'wrong', false, 'not this') RETURNING choice_id, is_correct`,
    [q.rows[0].question_id]
  );
  return {
    modId,
    lessonId: lesson.rows[0].step_id,
    finalId: final.rows[0].step_id,
    correct: choices.rows.find((c) => c.is_correct).choice_id,
  };
}

const setStatus = (mod, status) => pool.query("UPDATE module_data SET status = $1 WHERE mod_id = $2", [status, mod.modId]);
const enroll = (user, mod, modstatus = "In Progress", progress = 0) =>
  pool.query("INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, $3, $4)", [user.id, mod.modId, modstatus, progress]);

async function api(user, method, path, body) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
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

async function passFinalAssessment(user, mod) {
  const start = await api(user, "POST", `/modules/${mod.modId}/steps/${mod.finalId}/attempts`);
  assert.equal(start.status, 200, `start attempt: ${start.status} ${JSON.stringify(start.body)}`);
  let state = start.body.data;
  for (let i = 0; i < state.total; i += 1) {
    const qid = state.questions[state.currentIndex].question_id;
    state = (await api(user, "POST", `/modules/attempts/${state.attemptId}/answers`, { questionId: qid, selectedChoiceIds: [mod.correct] })).body.data;
    if (i < state.total - 1) state = (await api(user, "POST", `/modules/attempts/${state.attemptId}/next`, { fromIndex: i })).body.data;
  }
  return api(user, "POST", `/modules/attempts/${state.attemptId}/submit`);
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
       (SELECT COUNT(*)::int FROM certificates WHERE user_id = ANY($1) OR module_id = ANY($2)) AS certificates`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const inProgress = await createUser("inprogress");
  const completed = await createUser("completed");
  const outsider = await createUser("outsider");
  const stray = await createUser("stray");

  // a) and b): enrolled while published, then the version is archived
  const modA = await createModule("archived_inprogress", "published");
  await enroll(inProgress, modA);
  await setStatus(modA, "archived");
  const modB = await createModule("archived_completed", "published");
  await enroll(completed, modB, "Completed", 100);
  await setStatus(modB, "archived");
  // c) archived, never enrolled
  const modC = await createModule("archived_outsider", "archived");
  // d) never published
  const modDraft = await createModule("draft", "draft");
  const modPending = await createModule("pending", "pending_review");
  await enroll(stray, modPending);
  // e) published
  const modE = await createModule("published", "published");
  await enroll(inProgress, modE);

  await check("a) enrolled in-progress learner: details and viewer 200 after archive", async () => {
    assert.equal((await api(inProgress, "GET", `/modules/${modA.modId}/details`)).status, 200);
    assert.equal((await api(inProgress, "GET", `/modules/${modA.modId}/viewer`)).status, 200);
  });
  await check("a) enrolled in-progress learner: a lesson step completes", async () => {
    const res = await api(inProgress, "POST", `/modules/${modA.modId}/steps/${modA.lessonId}/complete`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
  });
  await check("a) enrolled in-progress learner: final assessment passes and a certificate is issued", async () => {
    const submit = await passFinalAssessment(inProgress, modA);
    assert.equal(submit.status, 200, JSON.stringify(submit.body));
    assert.equal(submit.body.passed, true);
    const certs = await pool.query("SELECT 1 FROM certificates WHERE user_id = $1 AND module_id = $2", [inProgress.id, modA.modId]);
    assert.equal(certs.rowCount, 1, "no certificate");
  });
  await check("b) enrolled completed learner: details and viewer 200 after archive", async () => {
    assert.equal((await api(completed, "GET", `/modules/${modB.modId}/details`)).status, 200);
    assert.equal((await api(completed, "GET", `/modules/${modB.modId}/viewer`)).status, 200);
  });
  await check("c) not enrolled, archived: 404 on details, viewer, assessment start and enroll", async () => {
    assert.equal((await api(outsider, "GET", `/modules/${modC.modId}/details`)).status, 404);
    assert.equal((await api(outsider, "GET", `/modules/${modC.modId}/viewer`)).status, 404);
    assert.equal((await api(outsider, "POST", `/modules/${modC.modId}/steps/${modC.finalId}/attempts`)).status, 404);
    assert.equal((await api(outsider, "POST", `/modules/${modC.modId}/enroll`, { code: "WHATEVER" })).status, 404);
  });
  await check("d) draft and pending_review: 404 for learners, even with an enrollment row", async () => {
    for (const [user, mod] of [[outsider, modDraft], [outsider, modPending], [stray, modPending]]) {
      assert.equal((await api(user, "GET", `/modules/${mod.modId}/details`)).status, 404, `details ${mod.modId}`);
      assert.equal((await api(user, "GET", `/modules/${mod.modId}/viewer`)).status, 404, `viewer ${mod.modId}`);
      assert.equal((await api(user, "POST", `/modules/${mod.modId}/steps/${mod.finalId}/attempts`)).status, 404, `attempt ${mod.modId}`);
    }
  });
  await check("e) published: enrolled learner gets details, viewer and an attempt", async () => {
    assert.equal((await api(inProgress, "GET", `/modules/${modE.modId}/details`)).status, 200);
    assert.equal((await api(inProgress, "GET", `/modules/${modE.modId}/viewer`)).status, 200);
    // The final needs the lesson before it (P4-02)
    assert.equal((await api(inProgress, "POST", `/modules/${modE.modId}/steps/${modE.lessonId}/complete`)).status, 200);
    assert.equal((await api(inProgress, "POST", `/modules/${modE.modId}/steps/${modE.finalId}/attempts`)).status, 200);
  });
  await check("e) published: not enrolled gets details 200, viewer 403, enroll without code 400", async () => {
    assert.equal((await api(outsider, "GET", `/modules/${modE.modId}/details`)).status, 200);
    assert.equal((await api(outsider, "GET", `/modules/${modE.modId}/viewer`)).status, 403);
    assert.equal((await api(outsider, "POST", `/modules/${modE.modId}/enroll`, {})).status, 400);
  });

  // f) a learner whose versions were replaced by newer published ones
  const dash = await createUser("dashboard");
  const replaced = async (label, modstatus, progress) => {
    const old = await createModule(label, "published");
    await enroll(dash, old, modstatus, progress);
    const newer = await createModule(`${label}_v2`, "published");
    await pool.query("UPDATE module_data SET parent_mod_id = $1 WHERE mod_id = $2", [old.modId, newer.modId]);
    await setStatus(old, "archived");
    return old;
  };
  const archHalf = await replaced("dash_archived_half", "In Progress", 50);
  const archZeroNewer = await replaced("dash_archived_zero", "In Progress", 0);
  const archDone = await replaced("dash_archived_done", "Completed", 100);
  const archZeroAlone = await createModule("dash_archived_zero_alone", "archived");
  await enroll(dash, archZeroAlone, "In Progress", 0);
  const pubPart = await createModule("dash_published_part", "published");
  await enroll(dash, pubPart, "In Progress", 30);

  await check("f) dashboard: archived versions with 0 < progress < 100 are in progress", async () => {
    const res = await api(dash, "GET", "/user/dashboard");
    assert.equal(res.status, 200);
    const listed = res.body.data.enrolledModules;
    const ids = new Set(listed.map((m) => m.id));
    assert.ok(ids.has(archHalf.modId) && ids.has(archDone.modId) && ids.has(archZeroAlone.modId) && ids.has(pubPart.modId), "an expected enrollment is missing from the payload");
    assert.ok(!ids.has(archZeroNewer.modId), "archived 0% version with a newer version should stay hidden");
    const { canResumeEnrollment } = await import(
      pathToFileURL(path.join(__dirname, "../../client/src/utils/enrollmentFilters.js")).href
    );
    // Same filter as the dashboard's Resume / Continue list (Dashboard.jsx activeModules)
    const inProgress = new Set(listed.filter((m) => m.progress < 100 && canResumeEnrollment(m)).map((m) => m.id));
    assert.ok(inProgress.has(archHalf.modId), "archived version at 50% is not in progress");
    assert.ok(inProgress.has(pubPart.modId), "published module at 30% is not in progress");
    assert.ok(!inProgress.has(archZeroAlone.modId), "archived version at 0% should not be in progress");
    assert.ok(!inProgress.has(archDone.modId), "completed archived version should not be in progress");
    // Completion rate counts the same enrollments: published 30, archived 50 and archived 100
    // (archived 0% versions don't count): (30 + 50 + 100) / 3 = 60
    assert.equal(res.body.data.completionRate, 60, "completionRate");
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
    console.log(failed ? `FAILED: ${failed} check(s) failed` : "All archived-version access checks passed.");
    process.exit(failed ? 1 : 0);
  });
