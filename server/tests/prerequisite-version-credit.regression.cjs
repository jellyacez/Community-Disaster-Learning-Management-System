/**
 * Regression test (P5-02): completing an earlier version of a prerequisite module keeps
 * prerequisite credit after a newer version is published and the old one is archived.
 *
 * Before the fix, publishing Fundamentals v2 re-locked every General module for learners who
 * had completed v1: the progression rule only counted the learner's own mod_ids, and the
 * archived v1 is not among the published modules it checks.
 *
 * Flow: Fundamentals F v1 published, General G gated on Fundamentals, a revision F v2 is
 * approved through PUT /api/admin/mdrrmo/module/:id/review (which archives v1). Then:
 *   a) completed v1: G unlocked in /modules/available and /modules/:id/details,
 *      request-code allowed, enroll with the code succeeds
 *   b) never completed any version: G still locked, enroll and request-code 403
 *   c) v1 in progress: locked; after they complete v1, unlocked
 *   d) enrolled in G before v2 was published, completed v1: viewer still 200
 *   e) the same lineage rule applies to the Beginner -> Intermediate tier: completing an
 *      archived Beginner version unlocks the category's Intermediate module
 *
 * Learners are credited (by SQL) with every other published Fundamentals / Flood Beginner
 * module that already exists, so the result depends only on this test's fixtures.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Fixtures are seeded directly into the
 * database from server/.env and removed by exact ID in `finally`. Refuses to run unless the
 * database is on a loopback address.
 *
 * Run from the repo root:  node server/tests/prerequisite-version-credit.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "prerequisite-version-credit-regression/1.0";
const RUN = `regress_pv_${crypto.randomBytes(4).toString("hex")}`;
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

// One level with one lesson step, so the viewer has something to load
async function createModule(label, { modcat, level, status, parent = null }) {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const mod = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status, enrollment_code, parent_mod_id)
     VALUES ($1, $2, 'Prerequisite version credit regression fixture', $3, '5 mins', $4, $5, $6) RETURNING mod_id`,
    [`${RUN}_${label}`, modcat, level, status, code, parent]
  );
  const modId = mod.rows[0].mod_id;
  created.modIds.push(modId);
  const lvl = await pool.query(
    `INSERT INTO levels (mod_id, level_order, level_title, passing_threshold, is_locked_by_default)
     VALUES ($1, 1, 'Regression Level', 80, false) RETURNING level_id`,
    [modId]
  );
  await pool.query(
    `INSERT INTO module_steps (level_id, step_order, step_title, step_type, step_content, is_final_assessment)
     VALUES ($1, 1, 'Regression Lesson', 'lesson', '<p>Read this.</p>', false)`,
    [lvl.rows[0].level_id]
  );
  return { id: modId, code };
}

async function setActivity(userId, modId, modstatus, progress) {
  await pool.query(
    `INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, mod_id) DO UPDATE SET modstatus = EXCLUDED.modstatus, progress = EXCLUDED.progress`,
    [userId, modId, modstatus, progress]
  );
}

// Completed rows for published prerequisite modules that are not this test's fixtures
async function creditExistingPrerequisites(userId) {
  const { rows } = await pool.query(
    `SELECT mod_id FROM module_data
     WHERE status = 'published' AND moddateremove IS NULL AND NOT (mod_id = ANY($1))
       AND (lower(trim(modcat)) = 'fundamentals'
            OR (lower(trim(modcat)) = 'flood' AND lower(trim(level)) IN ('beginner', 'level 1')))`,
    [created.modIds]
  );
  for (const r of rows) await setActivity(userId, r.mod_id, "Completed", 100);
}

async function api(user, method, path, body) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function availableEntry(user, modId) {
  const res = await api(user, "GET", "/modules/available");
  assert.equal(res.status, 200, `/modules/available ${res.status}`);
  const entry = res.body.find((m) => m.id === modId);
  assert.ok(entry, `module ${modId} missing from /modules/available`);
  return entry;
}

async function detailsModule(user, modId) {
  const res = await api(user, "GET", `/modules/${modId}/details`);
  assert.equal(res.status, 200, `/modules/${modId}/details ${res.status}`);
  return res.body.module;
}

async function assertLocked(user, modId, expected) {
  const entry = await availableEntry(user, modId);
  const details = await detailsModule(user, modId);
  assert.equal(entry.is_locked, expected, `catalog is_locked=${entry.is_locked} (${entry.lock_reason})`);
  assert.equal(Boolean(details.is_locked), expected, `details is_locked=${details.is_locked} (${details.lock_reason})`);
  return entry;
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

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM enrollment_requests WHERE user_id = ANY($1) OR module_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM user_step_progress WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM module_activity WHERE user_id = ANY($1) OR mod_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM user_notification WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM module_steps WHERE level_id IN (SELECT level_id FROM levels WHERE mod_id = ANY($1))", [modIds]);
    await client.query("DELETE FROM levels WHERE mod_id = ANY($1)", [modIds]);
    await client.query("UPDATE module_data SET parent_mod_id = NULL WHERE mod_id = ANY($1)", [modIds]);
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
    `SELECT (SELECT COUNT(*)::int FROM "user" WHERE id = ANY($1)) AS users,
            (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2)) AS modules,
            (SELECT COUNT(*)::int FROM module_activity WHERE user_id = ANY($1)) AS activity,
            (SELECT COUNT(*)::int FROM enrollment_requests WHERE user_id = ANY($1)) AS requests`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const head = await createUser("head", "head_mdrrmo_admin");

  const fundV1 = await createModule("fund_v1", { modcat: "Fundamentals", level: "Beginner", status: "published" });
  const general = await createModule("general", { modcat: "General", level: "Beginner", status: "published" });
  const floodBegV1 = await createModule("flood_beg_v1", { modcat: "Flood", level: "Beginner", status: "published" });
  const floodInter = await createModule("flood_inter", { modcat: "Flood", level: "Intermediate", status: "published" });

  const completer = await createUser("completer");
  const never = await createUser("never");
  const inProgress = await createUser("inprogress");
  const midCourse = await createUser("midcourse");
  for (const u of [completer, never, inProgress, midCourse]) await creditExistingPrerequisites(u.id);

  await setActivity(completer.id, fundV1.id, "Completed", 100);
  await setActivity(completer.id, floodBegV1.id, "Completed", 100);
  await setActivity(inProgress.id, fundV1.id, "In Progress", 50);
  await setActivity(midCourse.id, fundV1.id, "Completed", 100);
  await setActivity(midCourse.id, general.id, "In Progress", 0);

  await check("baseline: v1 completer has General unlocked before v2 exists", async () => {
    await assertLocked(completer, general.id, false);
    await assertLocked(never, general.id, true);
  });

  // Publish the revisions through the review endpoint, which archives each parent
  const fundV2 = await createModule("fund_v2", { modcat: "Fundamentals", level: "Beginner", status: "pending_review", parent: fundV1.id });
  const floodBegV2 = await createModule("flood_beg_v2", { modcat: "Flood", level: "Beginner", status: "pending_review", parent: floodBegV1.id });
  for (const rev of [fundV2, floodBegV2]) {
    const res = await api(head, "PUT", `/admin/mdrrmo/module/${rev.id}/review`, { status: "published" });
    assert.equal(res.status, 200, `publish ${rev.id}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const { rows: st } = await pool.query("SELECT mod_id, status FROM module_data WHERE mod_id = ANY($1)", [
    [fundV1.id, fundV2.id, floodBegV1.id, floodBegV2.id],
  ]);
  const statusOf = Object.fromEntries(st.map((r) => [r.mod_id, r.status]));
  assert.equal(statusOf[fundV1.id], "archived");
  assert.equal(statusOf[fundV2.id], "published");
  assert.equal(statusOf[floodBegV1.id], "archived");

  await check("a) completed v1: General stays unlocked in catalog and details", async () => {
    await assertLocked(completer, general.id, false);
  });

  await check("a) completed v1: request-code allowed, enroll with code succeeds", async () => {
    const req = await api(completer, "POST", `/modules/${general.id}/request-code`);
    assert.equal(req.status, 200, `request-code ${req.status} ${req.body.message}`);
    const enr = await api(completer, "POST", `/modules/${general.id}/enroll`, { code: general.code });
    assert.equal(enr.status, 200, `enroll ${enr.status} ${enr.body.message}`);
  });

  await check("b) never completed any version: General locked, enroll/request-code 403", async () => {
    const entry = await assertLocked(never, general.id, true);
    assert.match(entry.lock_reason, /Complete all Fundamentals first \(1 remaining\)/);
    const req = await api(never, "POST", `/modules/${general.id}/request-code`);
    assert.equal(req.status, 403, `request-code ${req.status}`);
    const enr = await api(never, "POST", `/modules/${general.id}/enroll`, { code: general.code });
    assert.equal(enr.status, 403, `enroll ${enr.status}`);
  });

  await check("c) v1 in progress: still locked", async () => {
    await assertLocked(inProgress, general.id, true);
    const enr = await api(inProgress, "POST", `/modules/${general.id}/enroll`, { code: general.code });
    assert.equal(enr.status, 403, `enroll ${enr.status}`);
  });

  await check("c) after completing archived v1: unlocked and enrollable", async () => {
    await setActivity(inProgress.id, fundV1.id, "Completed", 100);
    await assertLocked(inProgress, general.id, false);
    const enr = await api(inProgress, "POST", `/modules/${general.id}/enroll`, { code: general.code });
    assert.equal(enr.status, 200, `enroll ${enr.status} ${enr.body.message}`);
  });

  await check("d) enrolled in General before v2: viewer still 200", async () => {
    const res = await api(midCourse, "GET", `/modules/${general.id}/viewer`);
    assert.equal(res.status, 200, `viewer ${res.status} ${res.body.message}`);
  });

  await check("e) archived Beginner version completed: Intermediate of that category unlocked", async () => {
    await assertLocked(completer, floodInter.id, false);
    const entry = await assertLocked(never, floodInter.id, true);
    assert.ok(entry.lock_reason, "locked entry has a reason");
  });

  const failed = results.filter((ok) => !ok).length;
  if (failed) throw new Error(`${failed} of ${results.length} checks failed`);
  console.log(`All ${results.length} prerequisite-version-credit regression checks passed.`);
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
