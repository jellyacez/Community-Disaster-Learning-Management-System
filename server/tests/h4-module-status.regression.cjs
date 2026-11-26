/**
 * Regression test for audit finding H4: module create/update took `status` from the request body,
 * so an author could publish without review. Fixed by the allowlist in utils/validators.js
 * (validateModulePayload): authors may only send draft or pending_review.
 *
 * state-transitions.regression.cjs already covers: create as "published" -> 400, create as "draft"
 * -> 201, and editing a published module can't clone it as "published". review-status-guard covers
 * the review route's guards. This file adds only what those leave out:
 *   a) create as pending_review -> 201 pending_review; create with no status -> 201 draft
 *   b) create with any other status ("archived", "rejected", "Published", " published", true,
 *      ["published"], null) -> 400 and no row
 *   c) editing an own draft: "published" -> 400 and still draft; "draft" -> 200; "pending_review" -> 200
 *   d) the approval route still publishes: a module the author submitted via the API, approved by
 *      a head_mdrrmo_admin -> 200 and published
 *
 * Sends real HTTP requests to a RUNNING LOCAL server; fixtures are seeded from server/.env and
 * removed by exact id. Refuses to run unless the database is on loopback, and refuses LMS_db.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> TEST_BASE_URL=http://localhost:<port> node server/tests/h4-module-status.regression.cjs
 */
const crypto = require("crypto");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "h4-module-status-regression/1.0";
const RUN = `regress_h4_${crypto.randomBytes(4).toString("hex")}`;
const created = { userIds: [], modIds: [] };
let passed = 0;
let failed = 0;

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

async function createUser(label, role) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@example.invalid`, role]
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

async function call(user, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// `status` is left out of the body when it is the NO_STATUS marker
const NO_STATUS = Symbol("no status");
function payload(label, status) {
  const body = {
    moduleName: `${RUN} ${label}`,
    moduleCategory: "General",
    description: "<p>H4 regression fixture</p>",
    level: "Beginner",
    duration: "5 mins",
    levels: [{ levelOrder: 1, levelTitle: "Level 1", steps: [{ stepOrder: 1, stepTitle: "Read", stepType: "text" }] }],
  };
  if (status !== NO_STATUS) body.status = status;
  return body;
}

async function byName(label) {
  const { rows } = await pool.query("SELECT mod_id, status FROM module_data WHERE modname = $1", [`${RUN} ${label}`]);
  for (const r of rows) if (!created.modIds.includes(r.mod_id)) created.modIds.push(r.mod_id);
  return rows;
}
const statusOf = async (modId) => (await pool.query("SELECT status FROM module_data WHERE mod_id = $1", [modId])).rows[0]?.status;

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

function expect(cond, message) {
  if (!cond) throw new Error(message);
}

async function main() {
  await assertScratchDatabase();
  const author = await createUser("author", "mdrrmo_admin");
  const head = await createUser("head", "head_mdrrmo_admin");

  await test("create as pending_review -> 201, stored pending_review", async () => {
    const res = await call(author, "POST", "/api/modules", payload("submitted", "pending_review"));
    const rows = await byName("submitted");
    expect(res.status === 201, `status ${res.status} ${JSON.stringify(res.body)}`);
    expect(rows.length === 1 && rows[0].status === "pending_review", `stored ${JSON.stringify(rows)}`);
  });

  await test("create with no status -> 201, stored draft", async () => {
    const res = await call(author, "POST", "/api/modules", payload("no status", NO_STATUS));
    const rows = await byName("no status");
    expect(res.status === 201, `status ${res.status} ${JSON.stringify(res.body)}`);
    expect(rows.length === 1 && rows[0].status === "draft", `stored ${JSON.stringify(rows)}`);
  });

  const refused = ["archived", "rejected", "Published", "PUBLISHED", " published", true, ["published"], null];
  for (const [i, status] of refused.entries()) {
    await test(`create with status ${JSON.stringify(status)} -> 400, no row`, async () => {
      const res = await call(author, "POST", "/api/modules", payload(`refused ${i}`, status));
      const rows = await byName(`refused ${i}`);
      expect(res.status === 400, `status ${res.status} ${JSON.stringify(res.body)}`);
      expect(rows.length === 0, `stored ${JSON.stringify(rows)}`);
    });
  }

  await test("editing an own draft as published -> 400, still draft", async () => {
    await call(author, "POST", "/api/modules", payload("draft to publish", "draft"));
    const [row] = await byName("draft to publish");
    expect(row, "fixture draft was not created");
    const res = await call(author, "PUT", `/api/modules/${row.mod_id}`, payload("draft to publish", "published"));
    expect(res.status === 400, `status ${res.status} ${JSON.stringify(res.body)}`);
    expect((await statusOf(row.mod_id)) === "draft", `stored ${await statusOf(row.mod_id)}`);
  });

  await test("editing an own draft as draft, then pending_review -> 200 each, stored to match", async () => {
    await call(author, "POST", "/api/modules", payload("draft to submit", "draft"));
    const [row] = await byName("draft to submit");
    expect(row, "fixture draft was not created");
    for (const status of ["draft", "pending_review"]) {
      const res = await call(author, "PUT", `/api/modules/${row.mod_id}`, payload("draft to submit", status));
      expect(res.status === 200, `${status}: status ${res.status} ${JSON.stringify(res.body)}`);
      expect((await statusOf(row.mod_id)) === status, `${status}: stored ${await statusOf(row.mod_id)}`);
    }
  });

  await test("the approval route still publishes a submitted module", async () => {
    await call(author, "POST", "/api/modules", payload("to approve", "pending_review"));
    const [row] = await byName("to approve");
    expect(row && row.status === "pending_review", `fixture ${JSON.stringify(row)}`);
    const res = await call(head, "PUT", `/api/admin/mdrrmo/module/${row.mod_id}/review`, { status: "published" });
    expect(res.status === 200, `status ${res.status} ${JSON.stringify(res.body)}`);
    expect((await statusOf(row.mod_id)) === "published", `stored ${await statusOf(row.mod_id)}`);
  });
}

async function cleanup() {
  const { userIds } = created;
  const modIds = (await pool.query("SELECT mod_id FROM module_data WHERE modname LIKE $1", [`${RUN} %`])).rows.map((r) => r.mod_id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM module_activity WHERE mod_id = ANY($1)", [modIds]);
    await client.query("UPDATE module_data SET parent_mod_id = NULL WHERE mod_id = ANY($1)", [modIds]);
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
