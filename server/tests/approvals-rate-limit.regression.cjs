/**
 * Regression test: the module approvals list shared the 20-per-15-minute write limiter.
 *
 * GET /api/admin/mdrrmo/approvals (polled every 60 s and refetched after every decision) sat on
 * adminWriteLimiter together with PUT /mdrrmo/module/:id/review, so a head hit 429 after about nine
 * approvals and could not review anything until the window reset.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that:
 *   - 25 reads of the approvals list (more than the write budget of 20) all return 200
 *   - a review (PUT) afterwards is not rate limited
 *
 * Fixtures (an admin, a module, a session, rate-limit rows keyed by the admin) are seeded directly
 * into the database from server/.env and removed by exact ID/key in `finally`. Refuses to run
 * unless the database is on loopback.
 *
 * Run from the repo root:  node server/tests/approvals-rate-limit.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "approvals-rate-limit-regression/1.0";
const RUN = `regress_rl_${crypto.randomBytes(4).toString("hex")}`;
const READS = 25;

const created = { userIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createAdmin() {
  const id = `${RUN}_head`;
  // Admin roles require MFA; the flag stands in for an enrolled second factor
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, 'Regression head', $2, true, 'head_mdrrmo_admin', true, false, false, NOW(), NOW())`,
    [id, `${id}@regression.invalid`]
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

async function createModule(label, status) {
  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'General', 'Approvals rate-limit regression fixture', 'Beginner', '5 mins', $2) RETURNING mod_id`,
    [`${RUN} ${label}`, status]
  );
  created.modIds.push(rows[0].mod_id);
  return rows[0].mod_id;
}

function request(admin, method, path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: admin.cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [userIds]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds]);
    await client.query("DELETE FROM rate_limit.records_aggregated WHERE key = ANY($1)", [userIds]);
    await client.query("DELETE FROM rate_limit.individual_records WHERE key = ANY($1)", [userIds]);
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
       (SELECT COUNT(*)::int FROM rate_limit.records_aggregated WHERE key = ANY($1)) AS rate_rows`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const admin = await createAdmin();
  const pending = await createModule("pending", "pending_review");

  const statuses = [];
  for (let i = 0; i < READS; i++) {
    statuses.push((await request(admin, "GET", "/api/admin/mdrrmo/approvals")).status);
  }
  assert.deepEqual(
    statuses.filter((s) => s !== 200),
    [],
    `approvals reads must all be 200, got ${statuses.join(",")}`
  );
  console.log(`ok - ${READS} reads of the approvals list all returned 200`);

  const res = await request(admin, "PUT", `/api/admin/mdrrmo/module/${pending}/review`, {
    status: "rejected",
    rejection_reason: "rate limit regression",
  });
  assert.notEqual(res.status, 429, "review was rate limited after reads");
  assert.equal(res.status, 200, await res.text());
  console.log("ok - the review PUT after the reads is not rate limited");

  console.log("All approvals rate-limit regression checks passed.");
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
