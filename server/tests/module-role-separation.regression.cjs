/**
 * Regression test: module authoring and approval were not separated (audit P1-02).
 *
 * manage_modules covered create, edit, revise and submit, and head_mdrrmo_admin and
 * system_admin both held it, so the approver could write a module and approve it, and the
 * system administrator could author training content. The review endpoint also never
 * compared the reviewer with the module's author.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that:
 *   - head_mdrrmo_admin and system_admin get 403 on create, edit, revise (edit of a published
 *     module), submit, the builder's edit-details read and upload-media, and nothing changes
 *   - mdrrmo_admin can create, submit, revise and reach upload-media
 *   - the head can still list modules, open the approvals queue, approve and reject an
 *     mdrrmo_admin's module
 *   - nobody can review a module they authored, super_admin included: 403 SELF_REVIEW_FORBIDDEN
 *   - an mdrrmo_admin can edit a draft left by a head (legacy data); it keeps its author, so
 *     that head can't approve it but another head can
 *
 * Fixtures (users, modules, sessions) are seeded directly into the database from server/.env
 * and removed by exact ID in `finally`. Refuses to run unless the database is on loopback.
 * upload-media is called without a file, so an allowed role gets 400 and nothing is stored.
 *
 * Run from the repo root:  node server/tests/module-role-separation.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "module-role-separation-regression/1.0";
const RUN = `regress_mrs_${crypto.randomBytes(4).toString("hex")}`;

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

async function call(user, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function modulePayload(label, status) {
  return {
    moduleName: `${RUN} ${label}`,
    moduleCategory: "General",
    description: "<p>Module role separation regression fixture</p>",
    level: "Beginner",
    duration: "5 mins",
    ...(status ? { status } : {}),
    levels: [{ levelOrder: 1, levelTitle: "Level 1", steps: [{ stepOrder: 1, stepTitle: "Read", stepType: "learning" }] }],
  };
}

async function seedModule(label, status, authorId) {
  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status, author_id)
     VALUES ($1, 'General', 'Module role separation regression fixture', 'Beginner', '5 mins', $2, $3) RETURNING mod_id`,
    [`${RUN} ${label}`, status, authorId]
  );
  created.modIds.push(rows[0].mod_id);
  return rows[0].mod_id;
}

async function moduleRow(modId) {
  const { rows } = await pool.query("SELECT modname, status, author_id FROM module_data WHERE mod_id = $1", [modId]);
  return rows[0];
}

async function modulesNamed(label) {
  const { rows } = await pool.query("SELECT mod_id, status, author_id, parent_mod_id FROM module_data WHERE modname = $1", [
    `${RUN} ${label}`,
  ]);
  created.modIds.push(...rows.map((r) => r.mod_id));
  return rows;
}

async function cleanup() {
  const { userIds } = created;
  // Revisions are created by the API, so collect every fixture module by name as well
  const { rows: named } = await pool.query("SELECT mod_id FROM module_data WHERE modname LIKE $1", [`${RUN}%`]);
  const modIds = [...new Set([...created.modIds, ...named.map((r) => r.mod_id)])];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE module_data SET parent_mod_id = NULL WHERE mod_id = ANY($1)", [modIds]);
    // levels, steps, questions and choices cascade from module_data
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
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2) OR modname LIKE $3) AS modules`,
    [userIds, modIds, `${RUN}%`]
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

  const author = await createUser("author", "mdrrmo_admin");
  const head = await createUser("head", "head_mdrrmo_admin");
  const head2 = await createUser("head2", "head_mdrrmo_admin");
  const sysAdmin = await createUser("sys", "system_admin");
  const superAdmin = await createUser("super", "super_admin");

  // Roles that review or run the system never author
  for (const [label, user] of [["head_mdrrmo_admin", head], ["system_admin", sysAdmin]]) {
    await check(`${label} can't create a module`, async () => {
      const res = await call(user, "POST", "/api/modules", modulePayload(`${label} create`));
      assert.equal(res.status, 403, JSON.stringify(res.body));
      assert.equal((await modulesNamed(`${label} create`)).length, 0, "a module was created");
    });

    await check(`${label} can't edit a draft`, async () => {
      const draft = await seedModule(`${label} edit target`, "draft", author.id);
      const res = await call(user, "PUT", `/api/modules/${draft}`, modulePayload(`${label} edited`));
      assert.equal(res.status, 403, JSON.stringify(res.body));
      assert.equal((await moduleRow(draft)).modname, `${RUN} ${label} edit target`);
    });

    await check(`${label} can't submit a draft for review`, async () => {
      const draft = await seedModule(`${label} submit target`, "draft", author.id);
      const res = await call(user, "PUT", `/api/modules/${draft}`, modulePayload(`${label} submit target`, "pending_review"));
      assert.equal(res.status, 403, JSON.stringify(res.body));
      assert.equal((await moduleRow(draft)).status, "draft");
    });

    await check(`${label} can't revise a published module`, async () => {
      const published = await seedModule(`${label} revise target`, "published", author.id);
      const res = await call(user, "PUT", `/api/modules/${published}`, modulePayload(`${label} revision`));
      assert.equal(res.status, 403, JSON.stringify(res.body));
      assert.equal((await modulesNamed(`${label} revision`)).length, 0, "a revision was created");
    });

    await check(`${label} can't open a module in the builder (edit-details)`, async () => {
      const draft = await seedModule(`${label} builder target`, "draft", author.id);
      const res = await call(user, "GET", `/api/modules/${draft}/edit-details`);
      assert.equal(res.status, 403, JSON.stringify(res.body));
    });

    await check(`${label} can't upload module media`, async () => {
      const res = await call(user, "POST", "/api/modules/upload-media", {});
      assert.equal(res.status, 403, JSON.stringify(res.body));
    });
  }

  // The author role keeps working
  let authored;
  await check("mdrrmo_admin can create a module", async () => {
    const res = await call(author, "POST", "/api/modules", modulePayload("authored"));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    authored = res.body.data.mod_id;
    created.modIds.push(authored);
    assert.equal((await moduleRow(authored)).author_id, author.id);
  });

  await check("mdrrmo_admin can open its module in the builder", async () => {
    const res = await call(author, "GET", `/api/modules/${authored}/edit-details`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
  });

  await check("mdrrmo_admin can submit its module for review", async () => {
    const res = await call(author, "PUT", `/api/modules/${authored}`, modulePayload("authored", "pending_review"));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await moduleRow(authored)).status, "pending_review");
  });

  await check("mdrrmo_admin reaches upload-media (400 without a file, not 403)", async () => {
    const res = await call(author, "POST", "/api/modules/upload-media", {});
    assert.equal(res.status, 400, JSON.stringify(res.body));
  });

  await check("mdrrmo_admin can revise a published module", async () => {
    const published = await seedModule("published by author", "published", author.id);
    const res = await call(author, "PUT", `/api/modules/${published}`, modulePayload("author revision"));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const rows = await modulesNamed("author revision");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].parent_mod_id, published);
  });

  // Review flows stay with the head
  await check("head can still list the module library", async () => {
    const res = await call(head, "GET", "/api/admin/modules?page=1&limit=5");
    assert.equal(res.status, 200, JSON.stringify(res.body));
  });

  await check("head can still open the approvals queue", async () => {
    const res = await call(head, "GET", "/api/admin/mdrrmo/approvals");
    assert.equal(res.status, 200, JSON.stringify(res.body));
  });

  await check("head can approve an mdrrmo_admin's module", async () => {
    const res = await call(head, "PUT", `/api/admin/mdrrmo/module/${authored}/review`, { status: "published" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await moduleRow(authored)).status, "published");
  });

  await check("head can reject an mdrrmo_admin's module", async () => {
    const pending = await seedModule("pending from author", "pending_review", author.id);
    const res = await call(head, "PUT", `/api/admin/mdrrmo/module/${pending}/review`, {
      status: "rejected",
      rejection_reason: "Needs sources",
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await moduleRow(pending)).status, "draft");
  });

  // Nobody reviews their own module
  await check("super_admin can't approve a module it authored", async () => {
    const res = await call(superAdmin, "POST", "/api/modules", modulePayload("super authored", "pending_review"));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const own = res.body.data.mod_id;
    created.modIds.push(own);
    const review = await call(superAdmin, "PUT", `/api/admin/mdrrmo/module/${own}/review`, { status: "published" });
    assert.equal(review.status, 403, JSON.stringify(review.body));
    assert.equal(review.body?.code, "SELF_REVIEW_FORBIDDEN");
    assert.equal((await moduleRow(own)).status, "pending_review");
  });

  await check("super_admin can't reject a module it authored", async () => {
    const own = await seedModule("super pending", "pending_review", superAdmin.id);
    const review = await call(superAdmin, "PUT", `/api/admin/mdrrmo/module/${own}/review`, {
      status: "rejected",
      rejection_reason: "x",
    });
    assert.equal(review.status, 403, JSON.stringify(review.body));
    assert.equal(review.body?.code, "SELF_REVIEW_FORBIDDEN");
    assert.equal((await moduleRow(own)).status, "pending_review");
  });

  // Legacy data: a module a head wrote before the rule
  await check("head can't approve a module it authored before the rule", async () => {
    const own = await seedModule("head legacy pending", "pending_review", head.id);
    const review = await call(head, "PUT", `/api/admin/mdrrmo/module/${own}/review`, { status: "published" });
    assert.equal(review.status, 403, JSON.stringify(review.body));
    assert.equal(review.body?.code, "SELF_REVIEW_FORBIDDEN");
    assert.equal((await moduleRow(own)).status, "pending_review");
  });

  await check("mdrrmo_admin can take over a head's legacy draft; another head approves it", async () => {
    const legacy = await seedModule("head legacy draft", "draft", head.id);
    const edit = await call(author, "PUT", `/api/modules/${legacy}`, modulePayload("head legacy draft", "pending_review"));
    assert.equal(edit.status, 200, JSON.stringify(edit.body));
    const row = await moduleRow(legacy);
    assert.equal(row.status, "pending_review");
    assert.equal(row.author_id, head.id, "editing doesn't change the author");

    const selfReview = await call(head, "PUT", `/api/admin/mdrrmo/module/${legacy}/review`, { status: "published" });
    assert.equal(selfReview.status, 403, JSON.stringify(selfReview.body));
    const otherReview = await call(head2, "PUT", `/api/admin/mdrrmo/module/${legacy}/review`, { status: "published" });
    assert.equal(otherReview.status, 200, JSON.stringify(otherReview.body));
    assert.equal((await moduleRow(legacy)).status, "published");
  });

  if (failures.length) throw new Error(`${failures.length} check(s) failed`);
  console.log("All module role separation regression checks passed.");
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
