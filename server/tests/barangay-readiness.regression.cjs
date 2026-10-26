/**
 * Regression test: the barangay Curriculum Readiness counts were always 0.
 *
 * getBarangayAnalytics counted modstatus = 'completed' / 'in_progress', but enrollments are
 * stored as 'Completed' / 'In Progress', so completed_count and in_progress_count never matched.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that, for a module with one
 * completed and one in-progress enrollment in the admin's barangay, GET
 * /api/admin/barangay/analytics reports completed 1, in progress 1, enrolled 2.
 *
 * Fixtures (users, a published module, enrollments, a session) are seeded directly into the
 * database from server/.env and removed by exact ID in `finally`. Refuses to run unless the
 * database is on loopback.
 *
 * Run from the repo root:  node server/tests/barangay-readiness.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "barangay-readiness-regression/1.0";
const RUN = `regress_br_${crypto.randomBytes(4).toString("hex")}`;

const created = { userIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role, barangayId) {
  const id = `${RUN}_${label}`;
  // Admin roles require MFA; the flag stands in for an enrolled second factor
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, barangay_id, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, $5, false, false, $6, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, role, role !== "resident", barangayId]
  );
  created.userIds.push(id);
  return id;
}

async function createSession(userId) {
  const ctx = await auth.$context;
  const token = crypto.randomBytes(24).toString("hex");
  await pool.query(
    `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
     VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW(), NOW(), '127.0.0.1', $3, $4)`,
    [`${userId}_session`, token, UA, userId]
  );
  const signature = crypto.createHmac("sha256", ctx.secret).update(token).digest("base64");
  return `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}`;
}

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM module_activity WHERE user_id = ANY($1) OR mod_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
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
  const barangayId = (await pool.query("SELECT id FROM barangays ORDER BY id LIMIT 1")).rows[0].id;

  const adminId = await createUser("admin", "barangay_admin", barangayId);
  const finished = await createUser("finished", "resident", barangayId);
  const learning = await createUser("learning", "resident", barangayId);

  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'General', 'Barangay readiness regression fixture', 'Beginner', '5 mins', 'published') RETURNING mod_id`,
    [RUN]
  );
  const modId = rows[0].mod_id;
  created.modIds.push(modId);

  // The two values the app stores (ModuleProgressService / enrollUserInModule)
  await pool.query(
    `INSERT INTO module_activity (user_id, mod_id, modstatus, progress)
     VALUES ($1, $3, 'Completed', 100), ($2, $3, 'In Progress', 40)`,
    [finished, learning, modId]
  );

  const res = await fetch(`${BASE_URL}/api/admin/barangay/analytics`, {
    headers: { Accept: "application/json", "User-Agent": UA, Cookie: await createSession(adminId) },
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));

  const row = body.data.modulePerformance.find((m) => m.module_id === modId);
  assert.ok(row, "fixture module missing from modulePerformance");
  console.log("module row:", JSON.stringify(row));

  assert.equal(row.total_enrolled, 2);
  assert.equal(row.completed_count, 1, "completed_count");
  assert.equal(row.in_progress_count, 1, "in_progress_count");
  console.log("ok - readiness counts match the stored enrollment statuses");
  console.log("All barangay-readiness regression checks passed.");
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
