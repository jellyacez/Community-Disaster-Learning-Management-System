/**
 * Regression test: unexpected errors leaked their text (database messages, internals) to the client.
 *
 * Several catch blocks returned error.message in the response, so a Postgres error such as
 * `value "99999999999" is out of range for type integer` or `invalid byte sequence for encoding
 * "UTF8": 0x00` reached the browser. The rule now: an error marked as expected (AppError, or a 4xx
 * statusCode set where it is thrown) keeps its status and message; anything else is logged and the
 * client gets a generic 500.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. For each route family it forces one
 * unexpected error (input that reaches the database and makes it fail) and asserts a 500 with the
 * generic message and no database text, then asserts one known domain error still returns its
 * original status and message:
 *   - barangay analytics (GET /api/admin/barangay/analytics)
 *   - super admin impersonation (POST /api/admin/super/impersonate/:userId)
 *   - enrollment code request, approve and decline (modules + admin/module-requests)
 *   - module create and update (POST/PUT /api/modules)
 * Plus unit checks of utils/httpErrors.js.
 *
 * Fixtures (users, sessions, one module) are seeded directly into the database from server/.env and
 * removed by exact ID in `finally`. Refuses to run unless the database is on loopback.
 *
 * Run from the repo root:  node server/tests/error-leaks.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");
const { AppError, isExpectedError, respondWithError } = require("../utils/httpErrors");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "error-leaks-regression/1.0";
const RUN = `regress_el_${crypto.randomBytes(4).toString("hex")}`;
const HUGE_ID = "99999999999"; // past int4, so the database rejects it as a parameter
const DB_TEXT = /out of range|invalid byte|0x00|integer|syntax|violates|relation|column|constraint|postgres/i;

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
     VALUES ($1, 'General', 'Error leak regression fixture', 'Beginner', '5 mins', $2, 'RGR234') RETURNING mod_id`,
    [`${RUN} ${label}`, status]
  );
  created.modIds.push(rows[0].mod_id);
  return rows[0].mod_id;
}

async function call(user, method, path, body, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function assertGeneric(res, field, message) {
  assert.equal(res.status, 500, JSON.stringify(res.body));
  assert.equal(res.body[field], message, JSON.stringify(res.body));
  assert.doesNotMatch(JSON.stringify(res.body), DB_TEXT, "response carries database text");
  assert.equal(res.body.detail, undefined, "response carries a detail field");
}

function modulePayload(overrides = {}) {
  return {
    moduleName: `${RUN} payload`,
    moduleCategory: "General",
    description: "<p>Regression</p>",
    level: "Beginner",
    duration: "5 mins",
    status: "draft",
    levels: [{ levelOrder: 1, levelTitle: "L1", steps: [{ stepTitle: "S1", stepType: "text" }] }],
    ...overrides,
  };
}

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM enrollment_requests WHERE user_id = ANY($1) OR module_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1) OR modname LIKE $2", [modIds, `${RUN}%`]);
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
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2) OR modname LIKE $3) AS modules`,
    [userIds, modIds, `${RUN}%`]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  // Keeps going after a failure, so one run reports every leak
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

  const head = await createUser("head", "head_mdrrmo_admin");
  const author = await createUser("author", "mdrrmo_admin");
  const superAdmin = await createUser("super", "super_admin");
  const resident = await createUser("resident", "resident");
  const published = await createModule("published", "published");
  const draft = await createModule("draft", "draft");

  // utils/httpErrors.js
  const fakeRes = () => ({ code: null, payload: null, status(c) { this.code = c; return this; }, json(p) { this.payload = p; return this; } });
  await check("httpErrors: marked errors keep status and message, others become a generic 500", () => {
    const marked = fakeRes();
    respondWithError(marked, new AppError("Nope.", 409), { event: "t", fallback: "Generic." });
    assert.deepEqual([marked.code, marked.payload], [409, { success: false, message: "Nope." }]);

    const legacy = Object.assign(new Error("Gone."), { statusCode: 404 });
    assert.equal(isExpectedError(legacy), true);

    const plain = fakeRes();
    respondWithError(plain, new Error("secret internals"), { event: "t", fallback: "Generic.", field: "error" });
    assert.deepEqual([plain.code, plain.payload], [500, { success: false, error: "Generic." }]);

    // A database error is never expected, even if something gave it a statusCode
    const pg = Object.assign(new Error('relation "x" does not exist'), { severity: "ERROR", code: "42P01", statusCode: 400 });
    assert.equal(isExpectedError(pg), false);
    assert.equal(isExpectedError(Object.assign(new Error("x"), { statusCode: 500 })), false);
  });

  // barangay analytics
  await check("barangay analytics: unexpected error is a generic 500, no detail", async () => {
    const res = await call(head, "GET", "/api/admin/barangay/analytics", null, { "x-barangay-scope": HUGE_ID });
    assertGeneric(res, "error", "Failed to load barangay analytics.");
  });
  await check("barangay analytics: no barangay selected is still a 400 NO_BARANGAY_SELECTED", async () => {
    const res = await call(head, "GET", "/api/admin/barangay/analytics");
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal(res.body.error, "NO_BARANGAY_SELECTED");
    assert.equal(res.body.message, "A target barangay must be selected to view this dashboard.");
  });

  // impersonation
  await check("impersonate: unexpected error is a generic 500", async () => {
    const res = await call(superAdmin, "POST", "/api/admin/super/impersonate/a%00b");
    assertGeneric(res, "error", "Failed to initiate user impersonation.");
  });
  await check("impersonate: unknown target is still a 404 with its message", async () => {
    const res = await call(superAdmin, "POST", `/api/admin/super/impersonate/${RUN}_nobody`);
    assert.equal(res.status, 404, JSON.stringify(res.body));
    assert.equal(res.body.error, "Target user not found.");
  });
  await check("impersonate: own account is still a 400 with its message", async () => {
    const res = await call(superAdmin, "POST", `/api/admin/super/impersonate/${superAdmin.id}`);
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal(res.body.error, "You cannot impersonate your own super admin account.");
  });

  // enrollment code requests
  await check("request-code: unexpected error is a generic 500", async () => {
    const res = await call(resident, "POST", `/api/modules/${HUGE_ID}/request-code`);
    assertGeneric(res, "message", "Failed to request code.");
  });
  await check("request-code: duplicate pending request is still a 400 with its message", async () => {
    const first = await call(resident, "POST", `/api/modules/${published}/request-code`);
    assert.equal(first.status, 200, JSON.stringify(first.body));
    const second = await call(resident, "POST", `/api/modules/${published}/request-code`);
    assert.equal(second.status, 400, JSON.stringify(second.body));
    assert.equal(second.body.message, "You already have a pending request for this module.");
  });
  await check("request-code: a draft module is still a 400 'not open for enrollment'", async () => {
    const res = await call(resident, "POST", `/api/modules/${draft}/request-code`);
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal(res.body.message, "This module is not open for enrollment.");
  });
  for (const action of ["approve", "reject"]) {
    await check(`${action} request: unexpected error is a generic 500`, async () => {
      const res = await call(head, "POST", `/api/admin/module-requests/${HUGE_ID}/${action}`);
      assertGeneric(res, "message", action === "approve" ? "Failed to approve request." : "Failed to decline request.");
    });
    await check(`${action} request: unknown request is still a 404 with its message`, async () => {
      const res = await call(head, "POST", `/api/admin/module-requests/2000000000/${action}`);
      assert.equal(res.status, 404, JSON.stringify(res.body));
      assert.equal(res.body.message, "Enrollment request not found.");
    });
  }

  // module create / update
  await check("create module: unexpected error is a generic 500", async () => {
    const res = await call(author, "POST", "/api/modules", modulePayload({ moduleName: `${RUN} nul\u0000byte` }));
    assertGeneric(res, "message", "Transaction failed. Database changes rolled back.");
  });
  await check("create module: two final assessments keep their message", async () => {
    const level = { levelOrder: 1, levelTitle: "L1", steps: [
        { stepTitle: "S1", stepType: "text", is_final_assessment: true },
        { stepTitle: "S2", stepType: "text", is_final_assessment: true },
      ],
    };
    const res = await call(author, "POST", "/api/modules", modulePayload({ levels: [level] }));
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal(
      res.body.message,
      'Transaction failed. Database changes rolled back. Validation Error: Level "L1" contains multiple Final Assessments. Only one final assessment is permitted per level.'
    );
  });
  await check("update module: unexpected error is a generic 500", async () => {
    const res = await call(author, "PUT", `/api/modules/${draft}`, modulePayload({ moduleName: `${RUN} nul\u0000byte` }));
    assertGeneric(res, "message", "Transaction failed. Database changes rolled back.");
  });
  await check("update module: unknown module is still a 404 with its message", async () => {
    const res = await call(author, "PUT", "/api/modules/2000000000", modulePayload());
    assert.equal(res.status, 404, JSON.stringify(res.body));
    assert.equal(res.body.message, "Target training module not found.");
  });

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):\n  - ${failures.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    console.log("All error-leak regression checks passed.");
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
