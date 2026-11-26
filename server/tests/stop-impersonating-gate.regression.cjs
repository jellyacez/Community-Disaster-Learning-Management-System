/**
 * Regression test for audit finding M11: POST /api/admin/super/stop-impersonating had no role check.
 * A resident got 200 "Exited impersonation mode. Restored Super Admin session.".
 *
 * Only two callers are legitimate (client/src/components/admin/ImpersonationBanner.jsx while
 * impersonating, and ProtectedRoute.jsx for a super_admin clearing leftover cookies), so the route
 * now accepts an impersonation session or a super_admin, and refuses every other role with 403.
 *
 * Asserts against a running API:
 *   a) resident, barangay_admin, mdrrmo_admin, head_mdrrmo_admin, system_admin -> 403, and no
 *      "Ended impersonation" activity row
 *   b) a resident who forges the two impersonation cookies (naming a real super_admin) -> 403
 *   c) a super_admin who is not impersonating -> 200 (clears leftover cookies)
 *   d) a super_admin impersonating a resident -> 200, both cookies cleared, one
 *      "Ended impersonation session" row for the super_admin
 *
 * Fixtures are seeded from server/.env and deleted by exact id. Refuses to run unless the database
 * is on loopback, and refuses LMS_db.
 *
 * Run from the repo root, with the API running on the same database:
 *   DB_DATABASE=<scratch> TEST_BASE_URL=http://localhost:<port> node server/tests/stop-impersonating-gate.regression.cjs
 */
const crypto = require("crypto");

const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const RUN = `regress_stopimp_${crypto.randomBytes(4).toString("hex")}`;
const UA = "stop-impersonating-gate-regression/1.0";
const created = { userIds: [] };
let passed = 0;
let failed = 0;

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

// A user with a live session; returns the signed Better Auth session cookie.
async function createUser(role) {
  const id = `${RUN}_${role}`;
  const barangayId = role === "barangay_admin" || role === "resident"
    ? (await pool.query("SELECT id FROM barangays ORDER BY id LIMIT 1")).rows[0].id
    : null;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, barangay_id, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, $5, NOW(), NOW())`,
    [id, `Regression ${role}`, `${id}@example.invalid`, role, barangayId]
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

const stop = (cookie) =>
  fetch(`${BASE_URL}/api/admin/super/stop-impersonating`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": UA, Cookie: cookie },
    body: "{}",
  });

const endedRows = async (userId) =>
  Number((await pool.query(`SELECT COUNT(*) AS n FROM activity_log WHERE user_id = $1 AND act_log LIKE 'Ended impersonation%'`, [userId])).rows[0].n);

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`not ok - ${name}\n  ${err.message}`);
  }
}

async function main() {
  await assertScratchDatabase();
  const users = {};
  for (const role of ["resident", "barangay_admin", "mdrrmo_admin", "head_mdrrmo_admin", "system_admin", "super_admin"]) {
    users[role] = await createUser(role);
  }

  for (const role of ["resident", "barangay_admin", "mdrrmo_admin", "head_mdrrmo_admin", "system_admin"]) {
    await test(`${role} gets 403`, async () => {
      const res = await stop(users[role].cookie);
      const body = await res.text();
      if (res.status !== 403) throw new Error(`expected 403, got ${res.status} ${body}`);
      if (/Restored Super Admin/.test(body)) throw new Error(`body claims a restored session: ${body}`);
      if (await endedRows(users[role].id)) throw new Error("an 'Ended impersonation' row was written");
    });
  }

  await test("a resident forging the impersonation cookies gets 403", async () => {
    const res = await stop(`${users.resident.cookie}; impersonator_id=${users.super_admin.id}; impersonated_target_id=${users.resident.id}`);
    if (res.status !== 403) throw new Error(`expected 403, got ${res.status} ${await res.text()}`);
    if (await endedRows(users.super_admin.id)) throw new Error("an 'Ended impersonation' row was written for the super_admin");
  });

  await test("a super_admin who isn't impersonating gets 200", async () => {
    const res = await stop(users.super_admin.cookie);
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status} ${await res.text()}`);
  });

  await test("a super_admin impersonating a resident gets 200, cookies cleared, one log row", async () => {
    const before = await endedRows(users.super_admin.id);
    const res = await stop(`${users.super_admin.cookie}; impersonator_id=${users.super_admin.id}; impersonated_target_id=${users.resident.id}`);
    if (res.status !== 200) throw new Error(`expected 200, got ${res.status} ${await res.text()}`);
    const setCookie = res.headers.getSetCookie().join("\n");
    for (const name of ["impersonator_id", "impersonated_target_id"]) {
      if (!new RegExp(`${name}=;`).test(setCookie)) throw new Error(`${name} not cleared: ${setCookie}`);
    }
    const after = await endedRows(users.super_admin.id);
    if (after - before !== 1) throw new Error(`expected one 'Ended impersonation' row, got ${after - before}`);
  });
}

async function cleanup() {
  if (!created.userIds.length) return;
  await pool.query(`DELETE FROM activity_log WHERE user_id = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
}

main()
  .catch((err) => {
    failed++;
    console.error("FAIL:", err.message);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("CLEANUP FAILED:", err.message);
      failed++;
    }
    await pool.end();
    console.log(`${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
