/**
 * Regression test: the enrollment code request flow (pending -> approved | rejected).
 *
 *   - GET/approve under /api/admin/module-requests only required a session, so a resident
 *     could list everyone's requests and approve their own to get the enrollment code.
 *   - Approve updated the request whatever its status, so it could be decided twice.
 *   - Requests were accepted for modules learners can't enroll in (drafts).
 *   - There was no way to decline a request, and nothing stopped two pending requests
 *     for the same user and module.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Fixtures are seeded directly into the
 * database from server/.env and removed by exact ID in `finally`. Refuses to run unless the
 * database is on loopback. Needs migration 16 (uq_enrollment_requests_one_pending).
 *
 * Run from the repo root:  node server/tests/enrollment-requests.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "enrollment-requests-regression/1.0";
const RUN = `regress_er_${crypto.randomBytes(4).toString("hex")}`;

const created = { userIds: [], modIds: [] };

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

async function createModule(label, status) {
  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status, enrollment_code)
     VALUES ($1, 'General', 'Enrollment request regression fixture', 'Beginner', '5 mins', $2, 'RGR234') RETURNING mod_id`,
    [`${RUN} ${label}`, status]
  );
  created.modIds.push(rows[0].mod_id);
  return rows[0].mod_id;
}

async function call(user, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function requestsFor(userId, modId) {
  const { rows } = await pool.query(
    "SELECT id, status FROM enrollment_requests WHERE user_id = $1 AND module_id = $2 ORDER BY id",
    [userId, modId]
  );
  return rows;
}

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM enrollment_requests WHERE user_id = ANY($1) OR module_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM user_step_progress WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM module_activity WHERE user_id = ANY($1) OR mod_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM user_notification WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
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
       (SELECT COUNT(*)::int FROM enrollment_requests WHERE user_id = ANY($1)) AS requests`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  // Keeps going after a failure, so one run reports every broken transition
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

  const admin = await createUser("admin", "mdrrmo_admin");
  const resident = await createUser("resident", "resident");
  const published = await createModule("published", "published");
  const draft = await createModule("draft", "draft");

  await check("a resident can request a code for a published module", async () => {
    const res = await call(resident, "POST", `/api/modules/${published}/request-code`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual((await requestsFor(resident.id, published)).map((r) => r.status), ["pending"]);
  });

  await check("a resident can't list the admin request queue", async () => {
    const res = await call(resident, "GET", "/api/admin/module-requests");
    assert.equal(res.status, 403, JSON.stringify(res.body));
  });

  await check("a resident can't approve their own request or see the code", async () => {
    const [own] = await requestsFor(resident.id, published);
    const res = await call(resident, "POST", `/api/admin/module-requests/${own.id}/approve`);
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal(res.body?.code, undefined);
    assert.equal((await requestsFor(resident.id, published))[0].status, "pending");
  });

  await check("a resident can't reject requests", async () => {
    const [own] = await requestsFor(resident.id, published);
    const res = await call(resident, "POST", `/api/admin/module-requests/${own.id}/reject`);
    assert.equal(res.status, 403, JSON.stringify(res.body));
  });

  await check("an MDRRMO admin sees the queue and approves the request", async () => {
    const list = await call(admin, "GET", "/api/admin/module-requests");
    assert.equal(list.status, 200, JSON.stringify(list.body));
    const [own] = await requestsFor(resident.id, published);
    assert.ok(list.body.data.some((r) => r.request_id === own.id));
    const res = await call(admin, "POST", `/api/admin/module-requests/${own.id}/approve`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.code, "RGR234");
    assert.equal((await requestsFor(resident.id, published))[0].status, "approved");
  });

  await check("an approved request can't be approved or rejected again", async () => {
    const [own] = await requestsFor(resident.id, published);
    const again = await call(admin, "POST", `/api/admin/module-requests/${own.id}/approve`);
    assert.equal(again.status, 409, JSON.stringify(again.body));
    const reject = await call(admin, "POST", `/api/admin/module-requests/${own.id}/reject`);
    assert.equal(reject.status, 409, JSON.stringify(reject.body));
    assert.equal((await requestsFor(resident.id, published))[0].status, "approved");
  });

  await check("deciding a request that doesn't exist is a 404", async () => {
    const res = await call(admin, "POST", "/api/admin/module-requests/2147483000/reject");
    assert.equal(res.status, 404, JSON.stringify(res.body));
  });

  await check("a rejected request notifies the learner and frees them to ask again", async () => {
    const learner = await createUser("declined", "resident");
    await call(learner, "POST", `/api/modules/${published}/request-code`);
    const [pending] = await requestsFor(learner.id, published);
    const res = await call(admin, "POST", `/api/admin/module-requests/${pending.id}/reject`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await requestsFor(learner.id, published))[0].status, "rejected");
    const { rows } = await pool.query("SELECT type FROM user_notification WHERE user_id = $1", [learner.id]);
    assert.ok(rows.some((r) => r.type === "code_rejected"));
    const rejectedList = await call(admin, "GET", "/api/admin/module-requests?status=rejected");
    assert.ok(rejectedList.body.data.some((r) => r.request_id === pending.id));
    const retry = await call(learner, "POST", `/api/modules/${published}/request-code`);
    assert.equal(retry.status, 200, JSON.stringify(retry.body));
    assert.deepEqual((await requestsFor(learner.id, published)).map((r) => r.status), ["rejected", "pending"]);
  });

  await check("a request for a draft module is refused", async () => {
    const res = await call(resident, "POST", `/api/modules/${draft}/request-code`);
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal((await requestsFor(resident.id, draft)).length, 0);
  });

  await check("simultaneous requests leave one pending request", async () => {
    const racer = await createUser("racer", "resident");
    const results = await Promise.all(
      Array.from({ length: 5 }, () => call(racer, "POST", `/api/modules/${published}/request-code`))
    );
    const rows = await requestsFor(racer.id, published);
    assert.equal(rows.length, 1, `rows: ${JSON.stringify(rows)}`);
    assert.equal(results.filter((r) => r.status === 200).length, 1);
  });

  // --- Bulk decisions ---
  const bulkLearners = [];
  for (const label of ["bulk1", "bulk2", "bulk3"]) {
    const learner = await createUser(label, "resident");
    await call(learner, "POST", `/api/modules/${published}/request-code`);
    bulkLearners.push({ ...learner, requestId: (await requestsFor(learner.id, published))[0].id });
  }

  await check("a resident can't use the bulk endpoint", async () => {
    const res = await call(resident, "POST", "/api/admin/module-requests/bulk-decide", {
      requestIds: [bulkLearners[0].requestId],
      decision: "approved",
    });
    assert.equal(res.status, 403, JSON.stringify(res.body));
    assert.equal((await requestsFor(bulkLearners[0].id, published))[0].status, "pending");
  });

  await check("bulk rejects malformed payloads", async () => {
    const bad = [
      { requestIds: [bulkLearners[0].requestId], decision: "pending" },
      { requestIds: [], decision: "approved" },
      { requestIds: ["1"], decision: "approved" },
      { requestIds: Array.from({ length: 101 }, (_, i) => i + 1), decision: "approved" },
    ];
    for (const body of bad) {
      const res = await call(admin, "POST", "/api/admin/module-requests/bulk-decide", body);
      assert.equal(res.status, 400, `${JSON.stringify(body).slice(0, 60)} -> ${res.status}`);
    }
  });

  await check("bulk decides only pending requests and skips handled ones", async () => {
    const [alreadyApproved] = await requestsFor(resident.id, published);
    const res = await call(admin, "POST", "/api/admin/module-requests/bulk-decide", {
      requestIds: [bulkLearners[0].requestId, bulkLearners[1].requestId, alreadyApproved.id],
      decision: "rejected",
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual([...res.body.decided].sort(), [bulkLearners[0].requestId, bulkLearners[1].requestId].sort());
    assert.equal(res.body.skipped, 1);
    assert.equal((await requestsFor(bulkLearners[0].id, published))[0].status, "rejected");
    assert.equal((await requestsFor(bulkLearners[1].id, published))[0].status, "rejected");
    assert.equal((await requestsFor(resident.id, published))[0].status, "approved");
    assert.equal((await requestsFor(bulkLearners[2].id, published))[0].status, "pending");
    const { rows } = await pool.query(
      "SELECT user_id FROM user_notification WHERE type = 'code_rejected' AND user_id = ANY($1)",
      [[bulkLearners[0].id, bulkLearners[1].id]]
    );
    assert.equal(rows.length, 2);
  });

  await check("bulk accept sends each learner the code", async () => {
    const res = await call(admin, "POST", "/api/admin/module-requests/bulk-decide", {
      requestIds: [bulkLearners[2].requestId],
      decision: "approved",
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await requestsFor(bulkLearners[2].id, published))[0].status, "approved");
    const { rows } = await pool.query(
      "SELECT message FROM user_notification WHERE type = 'code_approved' AND user_id = $1",
      [bulkLearners[2].id]
    );
    assert.ok(rows[0]?.message.includes("RGR234"));
  });

  if (failures.length) throw new Error(`${failures.length} check(s) failed`);
  console.log("All enrollment-request regression checks passed.");
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
