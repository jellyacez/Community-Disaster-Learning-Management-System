/**
 * Regression test: the module review endpoint changed a module's status whatever it was.
 *
 * PUT /api/admin/mdrrmo/module/:id/review accepted approve/reject for any module, so a reviewer
 * acting on a stale page could reject an already-published module back to draft (hiding it
 * from learners, and its next edit would rebuild its steps and drop learner progress).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that:
 *   - only a pending_review module can be approved or rejected; anything else gets 409
 *   - approving a pending revision still publishes it and archives its parent
 *   - rejecting a pending module still returns it to draft with the reason
 *   - two simultaneous reviews of the same module: exactly one applies
 *
 * Fixtures (an admin, modules, a session) are seeded directly into the database from
 * server/.env and removed by exact ID in `finally`. Refuses to run unless the database is
 * on loopback.
 *
 * Run from the repo root:  node server/tests/review-status-guard.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "review-status-guard-regression/1.0";
const RUN = `regress_rv_${crypto.randomBytes(4).toString("hex")}`;

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

async function createModule(label, status, parentModId = null) {
  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status, parent_mod_id)
     VALUES ($1, 'General', 'Review guard regression fixture', 'Beginner', '5 mins', $2, $3) RETURNING mod_id`,
    [`${RUN} ${label}`, status, parentModId]
  );
  created.modIds.push(rows[0].mod_id);
  return rows[0].mod_id;
}

async function statusOf(modId) {
  const { rows } = await pool.query("SELECT status, rejection_reason FROM module_data WHERE mod_id = $1", [modId]);
  return rows[0];
}

async function review(admin, modId, status, rejectionReason) {
  const res = await fetch(`${BASE_URL}/api/admin/mdrrmo/module/${modId}/review`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: admin.cookie },
    body: JSON.stringify({ status, rejection_reason: rejectionReason }),
  });
  return { status: res.status, body: await res.json() };
}

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE module_data SET parent_mod_id = NULL WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1)", [modIds]);
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
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2)) AS modules`,
    [userIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const admin = await createAdmin();
  const check = async (name, fn) => {
    await fn();
    console.log(`ok - ${name}`);
  };

  const published = await createModule("published", "published");
  const revision = await createModule("revision", "pending_review", published);
  const draft = await createModule("draft", "draft");

  await check("rejecting a published module is refused and leaves it published", async () => {
    const res = await review(admin, published, "rejected", "stale page");
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.equal(res.body.code, "NOT_PENDING_REVIEW");
    assert.equal((await statusOf(published)).status, "published");
  });

  await check("approving a draft is refused and leaves it a draft", async () => {
    const res = await review(admin, draft, "published");
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.equal((await statusOf(draft)).status, "draft");
  });

  await check("approving a pending revision publishes it and archives its parent", async () => {
    const res = await review(admin, revision, "published");
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await statusOf(revision)).status, "published");
    assert.equal((await statusOf(published)).status, "archived");
  });

  await check("rejecting the just-approved revision from a stale page is refused", async () => {
    const res = await review(admin, revision, "rejected", "second reviewer, stale page");
    assert.equal(res.status, 409, JSON.stringify(res.body));
    assert.equal((await statusOf(revision)).status, "published");
  });

  await check("two simultaneous reviews: exactly one applies", async () => {
    const pending = await createModule("pending", "pending_review");
    const [approve, reject] = await Promise.all([
      review(admin, pending, "published"),
      review(admin, pending, "rejected", "simultaneous"),
    ]);
    assert.deepEqual([approve.status, reject.status].sort(), [200, 409]);
    assert.equal((await statusOf(pending)).status, approve.status === 200 ? "published" : "draft");
  });

  await check("rejecting a pending module returns it to draft with the reason", async () => {
    const toReject = await createModule("to reject", "pending_review");
    const res = await review(admin, toReject, "rejected", "Needs sources");
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const after = await statusOf(toReject);
    assert.equal(after.status, "draft");
    assert.equal(after.rejection_reason, "Needs sources");
  });

  await check("if archiving the original fails, the revision isn't published either", async () => {
    const original = await createModule("original for failure", "published");
    const revision = await createModule("revision for failure", "pending_review", original);
    // Stand-in for any error between the two writes: archiving this one original throws
    const fn = `${RUN}_block_archive`;
    await pool.query(
      `CREATE FUNCTION ${fn}() RETURNS trigger LANGUAGE plpgsql AS $$
       BEGIN
         IF NEW.mod_id = ${original} AND NEW.status = 'archived' THEN
           RAISE EXCEPTION 'simulated archive failure';
         END IF;
         RETURN NEW;
       END $$`
    );
    await pool.query(`CREATE TRIGGER ${fn} BEFORE UPDATE ON module_data FOR EACH ROW EXECUTE FUNCTION ${fn}()`);
    try {
      const res = await review(admin, revision, "published");
      assert.equal(res.status, 500, JSON.stringify(res.body));
      assert.equal((await statusOf(revision)).status, "pending_review");
      assert.equal((await statusOf(original)).status, "published");
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS ${fn} ON module_data`);
      await pool.query(`DROP FUNCTION IF EXISTS ${fn}()`);
    }
  });

  console.log("All review-guard regression checks passed.");
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
