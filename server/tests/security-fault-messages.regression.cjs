/**
 * Regression test: refused admin actions sent developer text to the client, e.g.
 *   403 "SECURITY_FAULT: barangay_admin context missing barangay identifier for scoping."
 *   403 "SECURITY_FAULT: Provisioning role 'mdrrmo_admin' (rank 3) is not allowed for an actor with role 'mdrrmo_admin' (rank 3). ..."
 * They are now AppErrors with a plain message and the same status; the detail goes to logError
 * (event "security_fault").
 *
 * One request per route family, against a running API. Each must keep its status and carry no
 * developer text (SECURITY_FAULT, role ids such as mdrrmo_admin, "rank", "context", "identifier"):
 *   archive, bulk archive, unban   barangay_admin with no barangay           -> 403
 *   ban                            mdrrmo_admin bans a head_mdrrmo_admin     -> 403
 *   reset password                 system_admin resets a super_admin         -> 403
 *   role                           system_admin makes a resident system_admin -> 403; makes one super_admin -> 403
 *   update user                    system_admin edits another system_admin   -> 403; edits a super_admin -> 403
 *   provisioning                   mdrrmo_admin provisions an mdrrmo_admin   -> 403
 *   residents list                 barangay_admin with no barangay           -> 500 (unchanged, generic text)
 * and the refused barangay_admin archive leaves a "security_fault" line naming the actor in the
 * server's error log (server/logs/error-<UTC date>.log, read from this checkout).
 *
 * Fixtures are seeded from server/.env and deleted by exact id. Refuses to run unless the database
 * is on loopback, and refuses LMS_db.
 *
 * Run from the repo root, with the API running on the same database from this checkout:
 *   DB_DATABASE=<scratch> TEST_BASE_URL=http://localhost:<port> node server/tests/security-fault-messages.regression.cjs
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const RUN = `regress_secfault_${crypto.randomBytes(4).toString("hex")}`;
const UA = "security-fault-messages-regression/1.0";
const DEV_TEXT = /SECURITY_FAULT|super_admin|system_admin|head_mdrrmo_admin|mdrrmo_admin|barangay_admin|\brank\b|context|identifier|attempted|adminContext/i;
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

async function createUser(label, role, barangayId) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, barangay_id, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, $5, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@example.invalid`, role, barangayId]
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

async function call(actor, method, urlPath, body) {
  const res = await fetch(`${BASE_URL}/api/admin${urlPath}`, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": UA, Cookie: actor.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}

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

const expectPlain = (res, status) => {
  const problems = [];
  if (res.status !== status) problems.push(`status ${res.status}, expected ${status}`);
  const leak = DEV_TEXT.exec(res.text);
  if (leak) problems.push(`developer text "${leak[0]}" in the body`);
  if (problems.length) throw new Error(`${problems.join("; ")}: ${res.text}`);
};

async function main() {
  await assertScratchDatabase();
  const barangayId = (await pool.query("SELECT id FROM barangays ORDER BY id LIMIT 1")).rows[0].id;
  const u = {
    noBarangay: await createUser("brgy_nobrgy", "barangay_admin", null),
    mdrrmo: await createUser("mdrrmo", "mdrrmo_admin", null),
    head: await createUser("head", "head_mdrrmo_admin", null),
    sys: await createUser("sys", "system_admin", null),
    sys2: await createUser("sys2", "system_admin", null),
    sup: await createUser("sup", "super_admin", null),
    resident: await createUser("resident", "resident", barangayId),
  };

  await test("archive: barangay_admin with no barangay -> 403, plain", async () => {
    expectPlain(await call(u.noBarangay, "PATCH", `/users/${u.resident.id}/archive`, { archived: true }), 403);
  });
  await test("bulk archive: barangay_admin with no barangay -> 403, plain", async () => {
    expectPlain(await call(u.noBarangay, "PATCH", "/users/bulk-archive", { userIds: [u.resident.id], archived: true }), 403);
  });
  await test("unban: barangay_admin with no barangay -> 403, plain", async () => {
    expectPlain(await call(u.noBarangay, "PATCH", `/users/${u.resident.id}/unban`, {}), 403);
  });
  await test("ban: mdrrmo_admin bans a head_mdrrmo_admin -> 403, plain", async () => {
    expectPlain(await call(u.mdrrmo, "PATCH", `/users/${u.head.id}/ban`, { reason: "Regression check" }), 403);
  });
  await test("reset password: system_admin resets a super_admin -> 403, plain", async () => {
    expectPlain(await call(u.sys, "PUT", `/users/${u.sup.id}/password`, { password: "" }), 403);
  });
  await test("role: system_admin makes a resident system_admin -> 403, plain", async () => {
    expectPlain(await call(u.sys, "PATCH", `/users/${u.resident.id}/role`, { role: "system_admin" }), 403);
  });
  await test("role: system_admin makes a resident super_admin -> 403, plain", async () => {
    expectPlain(await call(u.sys, "PATCH", `/users/${u.resident.id}/role`, { role: "super_admin" }), 403);
  });
  await test("update user: system_admin edits another system_admin -> 403, plain", async () => {
    expectPlain(await call(u.sys, "PUT", `/users/${u.sys2.id}`, { name: "Regression Renamed", email: `${u.sys2.id}@example.invalid` }), 403);
  });
  await test("update user: system_admin edits a super_admin -> 403, plain", async () => {
    expectPlain(await call(u.sys, "PUT", `/users/${u.sup.id}`, { name: "Regression Renamed", email: `${u.sup.id}@example.invalid` }), 403);
  });
  await test("provisioning: mdrrmo_admin provisions an mdrrmo_admin -> 403, plain", async () => {
    expectPlain(await call(u.mdrrmo, "POST", "/users/provision", { name: "Regression Peer", email: `${RUN}_peer@example.invalid`, role: "mdrrmo_admin" }), 403);
  });
  await test("residents list: barangay_admin with no barangay -> 500, plain (unchanged)", async () => {
    expectPlain(await call(u.noBarangay, "GET", "/residents"), 500);
  });

  await test("the refused archive is logged as security_fault with the actor", async () => {
    const logFile = path.join(__dirname, "..", "logs", `error-${new Date().toISOString().split("T")[0]}.log`);
    const lines = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8").split("\n") : [];
    const hit = lines.find((l) => l.includes('"event":"security_fault"') && l.includes(u.noBarangay.id));
    if (!hit) throw new Error(`no security_fault line naming ${u.noBarangay.id} in ${logFile}`);
  });

  // nothing above may have changed a stored user
  await test("no refused request changed a user", async () => {
    const { rows } = await pool.query(`SELECT id, role, archived, banned, name FROM "user" WHERE id = ANY($1)`, [created.userIds]);
    const changed = rows.filter((r) => r.archived || r.banned || /Renamed/.test(r.name) || (r.id === u.resident.id && r.role !== "resident"));
    if (changed.length) throw new Error(`changed: ${JSON.stringify(changed)}`);
  });
}

async function cleanup() {
  if (!created.userIds.length) return;
  await pool.query(`DELETE FROM activity_log WHERE user_id = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1) OR email = $2`, [created.userIds, `${RUN}_peer@example.invalid`]);
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
