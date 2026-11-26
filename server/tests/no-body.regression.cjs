/**
 * Regression test: write requests sent with no body crashed with a 500 (audit P5-09, V-03).
 *
 * Express 5 leaves req.body undefined when a request has no body (or no JSON Content-Type), so
 * handlers doing `const { x } = req.body` threw a TypeError and the client got a generic 500
 * ("Cannot destructure property 'x' of 'req.body' as it is undefined"). Where a handler passed
 * req.body on (Joi validate, feedback replies), the crash surfaced as the handler's own 500.
 *
 * Sends real requests with NO body and NO Content-Type to a RUNNING LOCAL server, one or more
 * per route family, and asserts a 400 with the handler's validation message and no 500 text:
 *   - admin user management: delete, role, details, password reset, bulk archive, provision,
 *     ban (already a 400; must stay one and ban nobody)
 *   - admin settings: maintenance, broadcast (no setting may change)
 *   - admin security: blocked IPs
 *   - announcements: barangay and MDRRMO (Joi-validated routes)
 *   - admin feedback reply, MDRRMO module review
 *   - resident: feedback reply, onboarding
 * Then asserts valid JSON requests on the same routes still succeed.
 *
 * Fixtures (users, sessions, a credential account, a feedback ticket, a module) are seeded in SQL
 * from server/.env and removed by exact ID in `finally`. Refuses to run unless the database is on
 * loopback.
 *
 * Run from the repo root:  node server/tests/no-body.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "no-body-regression/1.0";
const RUN = `regress_nb_${crypto.randomBytes(4).toString("hex")}`;
const CRASH_TEXT = /Internal Server Error|Cannot destructure|undefined/i;

const created = { userIds: [], feedbackIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role) {
  const id = `${RUN}_${label}`;
  // Admin roles require MFA; the flag stands in for an enrolled second factor
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, role]
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

// No body and no Content-Type unless a body is given
async function call(user, method, path, body) {
  const headers = { Accept: "application/json", "User-Agent": UA, Cookie: user.cookie };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, text, body: json };
}

function assertValidation400(res, field, message) {
  assert.notEqual(res.status, 500, `got a 500: ${res.text}`);
  assert.doesNotMatch(res.text, CRASH_TEXT, "response carries crash text");
  assert.equal(res.status, 400, res.text);
  assert.equal(res.body?.[field], message, res.text);
}

async function setting(key) {
  const { rows } = await pool.query("SELECT value FROM system_settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

async function cleanup() {
  const { userIds, feedbackIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM feedback_messages WHERE feedback_id = ANY($1)", [feedbackIds]);
    await client.query("DELETE FROM feedbacks WHERE id = ANY($1) OR user_id = ANY($2)", [feedbackIds, userIds]);
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM user_notification WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
    await client.query(`DELETE FROM account WHERE "userId" = ANY($1)`, [userIds]);
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
       (SELECT COUNT(*)::int FROM feedbacks WHERE id = ANY($2)) AS feedbacks,
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($3)) AS modules`,
    [userIds, feedbackIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const failures = [];
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (err) {
      failures.push(name);
      console.log(`not ok - ${name}: ${err.message.split("\n")[0]}`);
    }
  };

  const superAdmin = await createUser("super", "super_admin");
  const sysAdmin = await createUser("sys", "system_admin");
  const head = await createUser("head", "head_mdrrmo_admin");
  const resident = await createUser("resident", "resident");
  const target = await createUser("target", "resident");
  const banTarget = await createUser("bantarget", "resident");

  // A credential account, so a password reset that went ahead would change this hash
  await pool.query(
    `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $2, 'regression-unchanged-hash', NOW(), NOW())`,
    [`${target.id}_account`, target.id]
  );
  const feedbackId = (await pool.query(
    `INSERT INTO feedbacks (user_id, recipient, type, subject, message)
     VALUES ($1, 'MDRRMO', 'General', $2, 'No-body regression fixture') RETURNING id`,
    [resident.id, RUN]
  )).rows[0].id;
  created.feedbackIds.push(feedbackId);
  const modId = (await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'General', 'No-body regression fixture', 'Beginner', '5 mins', 'pending_review') RETURNING mod_id`,
    [`${RUN} module`]
  )).rows[0].mod_id;
  created.modIds.push(modId);

  const maintenanceBefore = await setting("maintenance_mode");
  const broadcastBefore = await setting("broadcast_active");

  // admin user management
  await check("DELETE /admin/users/:id with no body is a 400 asking for the confirmation flag", async () => {
    const res = await call(sysAdmin, "DELETE", `/api/admin/users/${target.id}`);
    assertValidation400(res, "message", "Confirmation flag is required for this destructive action.");
  });
  await check("PATCH /admin/users/:id/role with no body is a 400 'Invalid role'", async () => {
    const res = await call(superAdmin, "PATCH", `/api/admin/users/${target.id}/role`);
    assertValidation400(res, "message", "Invalid role");
  });
  await check("PUT /admin/users/:id with no body is a 400 asking for name and email", async () => {
    const res = await call(sysAdmin, "PUT", `/api/admin/users/${target.id}`);
    assertValidation400(res, "message", "Valid name and email are required.");
  });
  await check("PUT /admin/users/:id/password with no body is a 400 and the password is unchanged", async () => {
    const res = await call(sysAdmin, "PUT", `/api/admin/users/${target.id}/password`);
    assertValidation400(res, "message", "Send a JSON body with the new password, or an empty password to generate one.");
    const { rows } = await pool.query(`SELECT password FROM account WHERE "userId" = $1`, [target.id]);
    assert.equal(rows[0].password, "regression-unchanged-hash", "password was reset");
  });
  await check("PATCH /admin/users/bulk-archive with no body is a 400 'No users selected'", async () => {
    const res = await call(sysAdmin, "PATCH", "/api/admin/users/bulk-archive");
    assertValidation400(res, "message", "No users selected");
  });
  await check("POST /admin/users/provision with no body is a 400 asking for name, email and role", async () => {
    const res = await call(superAdmin, "POST", "/api/admin/users/provision");
    assertValidation400(res, "message", "Name, email, and role are required.");
  });
  await check("PATCH /admin/users/:id/ban with no body stays a 400 and bans nobody", async () => {
    const res = await call(sysAdmin, "PATCH", `/api/admin/users/${banTarget.id}/ban`);
    assertValidation400(res, "message", "Send a JSON body containing the ban details.");
    const { rows } = await pool.query(`SELECT banned FROM "user" WHERE id = $1`, [banTarget.id]);
    assert.equal(rows[0].banned, false, "user was banned");
  });

  // admin settings
  await check("PATCH /admin/settings/maintenance with no body is a 400 and maintenance is unchanged", async () => {
    const res = await call(sysAdmin, "PATCH", "/api/admin/settings/maintenance");
    assertValidation400(res, "message", "Send enabled: true or false.");
    assert.equal(await setting("maintenance_mode"), maintenanceBefore, "maintenance_mode changed");
  });
  await check("PATCH /admin/settings/broadcast with no body is a 400 'Nothing to update.'", async () => {
    const res = await call(sysAdmin, "PATCH", "/api/admin/settings/broadcast");
    assertValidation400(res, "message", "Nothing to update.");
    assert.equal(await setting("broadcast_active"), broadcastBefore, "broadcast_active changed");
  });

  // admin security
  await check("POST /admin/security/blocked-ips with no body is a 400 asking for the IP", async () => {
    const res = await call(sysAdmin, "POST", "/api/admin/security/blocked-ips");
    assertValidation400(res, "message", "`IP address is required");
  });

  // announcements (Joi validate() passed an undefined body straight through)
  for (const path of ["/api/admin/barangay/announcements", "/api/admin/mdrrmo/announcements"]) {
    await check(`POST ${path.replace("/api", "")} with no body is a 400 VALIDATION_ERROR`, async () => {
      const res = await call(sysAdmin, "POST", path);
      assertValidation400(res, "error", "VALIDATION_ERROR");
    });
  }

  // feedback and module review
  await check("PUT /admin/mdrrmo/feedback/:id/reply with no body is a 400 asking for reply and status", async () => {
    const res = await call(superAdmin, "PUT", `/api/admin/mdrrmo/feedback/${feedbackId}/reply`);
    assertValidation400(res, "error", "Reply text and status are required.");
  });
  await check("PUT /admin/mdrrmo/module/:id/review with no body is a 400 'Invalid status'", async () => {
    const res = await call(head, "PUT", `/api/admin/mdrrmo/module/${modId}/review`);
    assertValidation400(res, "message", "Invalid status");
  });
  await check("PUT /feedbacks/:id/reply with no body is a 400 'Reply text is required.'", async () => {
    const res = await call(resident, "PUT", `/api/feedbacks/${feedbackId}/reply`);
    assertValidation400(res, "error", "Reply text is required.");
  });
  await check("POST /users/onboarding with no body is a 400 asking for name and barangay", async () => {
    const res = await call(resident, "POST", "/api/users/onboarding");
    assertValidation400(res, "message", "Name and Barangay are required.");
  });

  // valid JSON requests still go through
  await check("PATCH /admin/settings/maintenance with {enabled:false} still succeeds", async () => {
    const res = await call(sysAdmin, "PATCH", "/api/admin/settings/maintenance", { enabled: false });
    assert.equal(res.status, 200, res.text);
    assert.equal(await setting("maintenance_mode"), "false");
  });
  await check("PATCH /admin/users/:id/ban with a JSON body still bans", async () => {
    const res = await call(sysAdmin, "PATCH", `/api/admin/users/${banTarget.id}/ban`, { reason: "Regression", expiresAt: null });
    assert.equal(res.status, 200, res.text);
    const { rows } = await pool.query(`SELECT banned FROM "user" WHERE id = $1`, [banTarget.id]);
    assert.equal(rows[0].banned, true, "user was not banned");
  });
  await check("PUT /feedbacks/:id/reply with a JSON body still posts the reply", async () => {
    const res = await call(resident, "PUT", `/api/feedbacks/${feedbackId}/reply`, { reply: "Regression reply" });
    assert.equal(res.status, 200, res.text);
  });

  if (maintenanceBefore !== null) {
    await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'maintenance_mode'", [maintenanceBefore]);
  }

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):\n  - ${failures.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    console.log("All no-body regression checks passed.");
  }
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
