/**
 * Regression test: a cycle in module_data.parent_mod_id must not hang the requests that walk
 * module lineage with a recursive CTE.
 *
 * parent_mod_id links a revision to the version it was cloned from (ADR 0005). The app only
 * ever points a new row at an older one, but a bad restore or a manual edit can leave a cycle:
 * a self-loop (A.parent = A) or a 2-node loop (A.parent = B, B.parent = A). Before the fix,
 * the recursive CTEs in ModuleService.getAvailableModules (ancestor_tree) and
 * DashboardService.getDashboardData (module_roots, module_descendants) had no cycle guard, so
 * one cyclic row anywhere made /modules/available, details, enroll, viewer and request-code
 * (all of which evaluate the catalog) run until cancelled, for every user; the dashboard hung
 * for a learner enrolled in a cyclic lineage.
 *
 * Checks:
 *   1) acyclic lineage V1 (archived) -> V2 (archived) -> V3 (published): V3 carries
 *      previous_version_status 'Completed' for the V1 completer; the dashboard resolves the
 *      root to V1 and V3 as the latest published descendant. Run before and after the cycles
 *      exist, with the same expected values.
 *   2) with a self-loop S and a loop A <-> B present, each endpoint that runs one of the
 *      recursive queries answers within 5 s with a non-5xx status and a sane body.
 *
 * Every request carries AbortSignal.timeout(5000) so the unfixed code fails fast. Queries left
 * running by a timed-out request are cancelled (pg_cancel_backend, this database only) before
 * cleanup, since temp_file_limit may be unlimited and a runaway CTE spills to disk.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Fixtures are seeded directly into the
 * database from server/.env and removed by exact ID in `finally`. Refuses to run unless the
 * database is on a loopback address.
 *
 * Run from the repo root:  node server/tests/module-lineage-cycle.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "module-lineage-cycle-regression/1.0";
const RUN = `regress_lc_${crypto.randomBytes(4).toString("hex")}`;
const TIMEOUT_MS = 5000;
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

// Fundamentals are never prerequisite-locked, so every endpoint reaches the lineage query
async function createModule(label, { status, parent = null }) {
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const mod = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status, enrollment_code, parent_mod_id)
     VALUES ($1, 'Fundamentals', 'Module lineage cycle regression fixture', 'Beginner', '5 mins', $2, $3, $4) RETURNING mod_id`,
    [`${RUN}_${label}`, status, code, parent]
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

async function api(user, method, path, body) {
  const started = Date.now();
  let res;
  try {
    res = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err.name === "TimeoutError") throw new Error(`${method} ${path}: no response within ${TIMEOUT_MS} ms`);
    throw err;
  }
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json, ms: Date.now() - started };
}

function assertSane(res, label) {
  assert.ok(res.status < 500, `${label}: ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
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

async function checkAcyclic(phase, { completer, v3Learner, v1, v3 }) {
  await check(`${phase}: acyclic V1->V2->V3: catalog credits the V1 completer on V3`, async () => {
    const res = await api(completer, "GET", "/modules/available");
    assert.equal(res.status, 200, `/modules/available ${res.status}`);
    const entry = res.body.find((m) => m.id === v3.id);
    assert.ok(entry, "V3 missing from /modules/available");
    assert.equal(entry.previous_version_status, "Completed");
    assert.equal(entry.is_locked, false);
  });

  await check(`${phase}: acyclic V1->V2->V3: dashboard root and latest version unchanged`, async () => {
    const a = await api(completer, "GET", "/user/dashboard");
    assert.equal(a.status, 200, `dashboard ${a.status}`);
    const e1 = a.body.data.enrolledModules.find((m) => m.id === v1.id);
    assert.ok(e1, "V1 missing from the completer's dashboard");
    assert.equal(e1.root_mod_id, v1.id);
    assert.equal(e1.latest_published_id, v3.id);
    assert.equal(e1.has_newer_version, true);

    const b = await api(v3Learner, "GET", "/user/dashboard");
    assert.equal(b.status, 200, `dashboard ${b.status}`);
    const e3 = b.body.data.enrolledModules.find((m) => m.id === v3.id);
    assert.ok(e3, "V3 missing from the V3 learner's dashboard");
    assert.equal(e3.root_mod_id, v1.id);
    assert.equal(e3.latest_published_id, null);
    assert.equal(e3.has_newer_version, false);
  });
}

// A timed-out request leaves its query running server-side; stop it before cleanup
async function cancelRunawayLineageQueries() {
  const { rows } = await pool.query(
    `SELECT pid, pg_cancel_backend(pid) AS cancelled, now() - query_start AS running_for
     FROM pg_stat_activity
     WHERE datname = current_database() AND pid <> pg_backend_pid() AND state = 'active'
       AND query ILIKE '%with recursive%' AND query ILIKE '%parent_mod_id%'`
  );
  console.log(`runaway lineage queries cancelled: ${rows.length}`);
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
            (SELECT COUNT(*)::int FROM module_activity WHERE user_id = ANY($1)) AS activity`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();

  // Acyclic lineage
  const v1 = await createModule("v1", { status: "archived" });
  const v2 = await createModule("v2", { status: "archived", parent: v1.id });
  const v3 = await createModule("v3", { status: "published", parent: v2.id });
  const completer = await createUser("completer");
  const v3Learner = await createUser("v3learner");
  await setActivity(completer.id, v1.id, "Completed", 100);
  await setActivity(v3Learner.id, v3.id, "In Progress", 0);
  const acyclic = { completer, v3Learner, v1, v3 };

  await checkAcyclic("before cycles", acyclic);

  // Self-loop S, and A <-> B (A published, B its archived "parent")
  const s = await createModule("self", { status: "published" });
  const a = await createModule("cyc_a", { status: "published" });
  const b = await createModule("cyc_b", { status: "archived" });
  await pool.query("UPDATE module_data SET parent_mod_id = mod_id WHERE mod_id = $1", [s.id]);
  await pool.query("UPDATE module_data SET parent_mod_id = $2 WHERE mod_id = $1", [a.id, b.id]);
  await pool.query("UPDATE module_data SET parent_mod_id = $2 WHERE mod_id = $1", [b.id, a.id]);
  const cyc = await createUser("cyclic");
  await setActivity(cyc.id, s.id, "In Progress", 0);
  await setActivity(cyc.id, b.id, "In Progress", 50);

  await check("cycle present: GET /modules/available answers 200 with the cyclic modules listed", async () => {
    const res = await api(cyc, "GET", "/modules/available");
    assert.equal(res.status, 200, `/modules/available ${res.status}`);
    const ids = res.body.map((m) => m.id);
    assert.ok(ids.includes(s.id) && ids.includes(a.id), "cyclic published modules missing");
    assert.equal(res.body.find((m) => m.id === s.id).is_locked, false);
  });

  await check("cycle present: GET /modules/:id/details answers 200, unlocked", async () => {
    const res = await api(cyc, "GET", `/modules/${s.id}/details`);
    assert.equal(res.status, 200, `details ${res.status}`);
    assert.equal(Boolean(res.body.module.is_locked), false);
  });

  await check("cycle present: GET /modules/:id/viewer answers 200 for the enrolled learner", async () => {
    const res = await api(cyc, "GET", `/modules/${s.id}/viewer`);
    assert.equal(res.status, 200, `viewer ${res.status} ${res.body.message}`);
  });

  await check("cycle present: POST /modules/:id/request-code answers, prerequisites met", async () => {
    const res = await api(cyc, "POST", `/modules/${a.id}/request-code`);
    assertSane(res, "request-code");
    assert.notEqual(res.status, 403, `request-code ${res.status} ${res.body.message}`);
  });

  await check("cycle present: POST /modules/:id/enroll answers, prerequisites met", async () => {
    const res = await api(cyc, "POST", `/modules/${a.id}/enroll`, { code: a.code });
    assertSane(res, "enroll");
    assert.notEqual(res.status, 403, `enroll ${res.status} ${res.body.message}`);
  });

  await check("cycle present: GET /user/dashboard answers 200 for a learner enrolled in cyclic lineages", async () => {
    const res = await api(cyc, "GET", "/user/dashboard");
    assert.equal(res.status, 200, `dashboard ${res.status}`);
    const ids = res.body.data.enrolledModules.map((m) => m.id);
    assert.ok(ids.includes(s.id) && ids.includes(b.id), `enrolled cyclic modules missing: ${ids}`);
  });

  await checkAcyclic("cycle present", acyclic);

  const failed = results.filter((ok) => !ok).length;
  if (failed) throw new Error(`${failed} of ${results.length} checks failed`);
  console.log(`All ${results.length} module-lineage-cycle regression checks passed.`);
}

main()
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cancelRunawayLineageQueries();
      await cleanup();
    } catch (err) {
      console.error("cleanup failed:", err.message);
      process.exitCode = 1;
    }
    await pool.end();
  });
