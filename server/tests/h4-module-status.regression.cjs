/**
 * Regression test for audit finding H4: module authors could set any status
 * (including 'published') through the create/update routes, skipping approval.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts:
 *   rejected (400, nothing written):
 *     - POST /api/modules with status 'published'
 *     - PUT  /api/modules/:id (draft) with status 'published'
 *     - PUT  /api/modules/:id (published, clone path) with status 'published'
 *   still passing:
 *     - POST with status 'draft', with 'pending_review', and with no status (defaults to draft)
 *     - PUT on a published module with 'pending_review' clones a pending_review revision
 *     - head_mdrrmo_admin PUT /api/modules/:id/status 'published' still publishes it
 *
 * Fixtures are seeded directly into the database from server/.env and removed by
 * exact ID in `finally`. Sessions are inserted directly, so no emails are sent.
 * Refuses to run unless the database server is on a loopback address.
 *
 * Run from the repo root:  node server/tests/h4-module-status.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "h4-regression/1.0";
const RUN = `regress_h4_${crypto.randomBytes(4).toString("hex")}`;

const created = { userIds: [], modIds: new Set() };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createAdmin(label, role) {
  const id = `${RUN}_${label}`;
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

async function createFixtureModule(label, status, authorId) {
  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status, author_id)
     VALUES ($1, 'General', 'H4 regression fixture', 'Beginner', '5 mins', $2, $3) RETURNING mod_id`,
    [`${RUN} ${label}`, status, authorId]
  );
  created.modIds.add(rows[0].mod_id);
  return rows[0].mod_id;
}

function modulePayload(label, status) {
  return {
    moduleName: `${RUN} ${label}`,
    moduleCategory: "General",
    level: "Beginner",
    duration: "5 mins",
    description: "<p>H4 regression</p>",
    ...(status !== undefined && { status }),
    levels: [
      {
        levelTitle: "L1",
        levelOrder: 1,
        steps: [{ stepTitle: "S1", stepOrder: 1, stepType: "text", stepContent: "<p>x</p>" }],
      },
    ],
  };
}

async function request(user, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const modId = json?.data?.mod_id;
  if (modId) created.modIds.add(modId);
  console.log(`${method} ${path} -> HTTP ${res.status} ${JSON.stringify(json)}`);
  return { status: res.status, body: json };
}

async function moduleRow(modId) {
  const { rows } = await pool.query("SELECT modname, status, parent_mod_id FROM module_data WHERE mod_id = $1", [modId]);
  return rows[0];
}

async function countByName(label) {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM module_data WHERE modname = $1", [`${RUN} ${label}`]);
  return rows[0].n;
}

async function cleanup() {
  // Collect exact IDs of any module this run created, including clones and anything
  // a request might have created unexpectedly, then delete by those IDs only.
  const stray = await pool.query(
    "SELECT mod_id FROM module_data WHERE modname LIKE $1 OR parent_mod_id = ANY($2)",
    [`${RUN}%`, [...created.modIds]]
  );
  stray.rows.forEach((r) => created.modIds.add(r.mod_id));
  const modIds = [...created.modIds];
  const { userIds } = created;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM choices WHERE question_id IN (SELECT question_id FROM questions WHERE mod_id = ANY($1))", [modIds]);
    await client.query("DELETE FROM questions WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM module_steps WHERE level_id IN (SELECT level_id FROM levels WHERE mod_id = ANY($1))", [modIds]);
    await client.query("DELETE FROM levels WHERE mod_id = ANY($1)", [modIds]);
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
       (SELECT COUNT(*)::int FROM session WHERE "userId" = ANY($1)) AS sessions,
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2) OR modname LIKE $3) AS modules,
       (SELECT COUNT(*)::int FROM levels WHERE mod_id = ANY($2)) AS levels,
       (SELECT COUNT(*)::int FROM user_notification WHERE user_id = ANY($1)) AS notifications,
       (SELECT COUNT(*)::int FROM activity_log WHERE user_id = ANY($1)) AS activity_log`,
    [userIds, modIds, `${RUN}%`]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const author = await createAdmin("author", "mdrrmo_admin");
  const head = await createAdmin("head", "head_mdrrmo_admin");
  const draftId = await createFixtureModule("draft fixture", "draft", author.id);
  const publishedId = await createFixtureModule("published fixture", "published", author.id);

  // --- Rejected: 400 and nothing written ---
  let r = await request(author, "POST", "/api/modules", modulePayload("create-published", "published"));
  assert.equal(r.status, 400, "POST with status 'published' must be rejected");
  assert.equal(await countByName("create-published"), 0, "rejected POST must not create a module");

  r = await request(author, "PUT", `/api/modules/${draftId}`, modulePayload("put-published", "published"));
  assert.equal(r.status, 400, "PUT on a draft with status 'published' must be rejected");
  assert.deepEqual(await moduleRow(draftId), { modname: `${RUN} draft fixture`, status: "draft", parent_mod_id: null });

  r = await request(author, "PUT", `/api/modules/${publishedId}`, modulePayload("clone-published", "published"));
  assert.equal(r.status, 400, "clone path with status 'published' must be rejected");
  const clonesAfterReject = await pool.query("SELECT COUNT(*)::int AS n FROM module_data WHERE parent_mod_id = $1", [publishedId]);
  assert.equal(clonesAfterReject.rows[0].n, 0, "rejected clone request must not create a revision");

  // --- Still passing ---
  r = await request(author, "POST", "/api/modules", modulePayload("create-draft", "draft"));
  assert.equal(r.status, 201);
  assert.equal((await moduleRow(r.body.data.mod_id)).status, "draft");

  r = await request(author, "POST", "/api/modules", modulePayload("create-review", "pending_review"));
  assert.equal(r.status, 201);
  assert.equal((await moduleRow(r.body.data.mod_id)).status, "pending_review");

  r = await request(author, "POST", "/api/modules", modulePayload("create-no-status"));
  assert.equal(r.status, 201);
  assert.equal((await moduleRow(r.body.data.mod_id)).status, "draft", "absent status keeps the draft default");

  r = await request(author, "PUT", `/api/modules/${publishedId}`, modulePayload("clone-review", "pending_review"));
  assert.equal(r.status, 200, "Submit Changes for Review on a published module must clone");
  const cloneId = r.body.data.mod_id;
  assert.deepEqual(await moduleRow(cloneId), { modname: `${RUN} clone-review`, status: "pending_review", parent_mod_id: publishedId });

  r = await request(head, "PUT", `/api/modules/${cloneId}/status`, { status: "published" });
  assert.equal(r.status, 200, "approval route must still publish");
  assert.equal((await moduleRow(cloneId)).status, "published");
  assert.equal((await moduleRow(publishedId)).status, "archived", "approving a revision archives its parent");
}

main()
  .then(() => {
    console.log("PASS: H4 regression");
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error("FAIL:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("CLEANUP FAILED:", err.message);
      process.exitCode = 1;
    }
    await pool.end();
    process.exit(process.exitCode);
  });
