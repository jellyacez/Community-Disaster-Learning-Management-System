/**
 * Regression test for migration 13 (index and integrity fixes).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and inspects the local schema to assert:
 *   - simultaneous enroll requests for the same module create exactly one enrollment
 *     (module_activity had no UNIQUE (user_id, mod_id), and enrolling was check-then-insert)
 *   - a question can't point at a step that doesn't exist (questions.step_id had no foreign key)
 *   - the hot or cascading foreign-key columns are indexed, and the three redundant
 *     single-column indexes are gone
 *
 * Fixtures (a resident, a published module, a session) are seeded directly into the database
 * from server/.env and removed by exact ID in `finally`. Refuses to run unless the database is
 * on loopback.
 *
 * Run from the repo root:  node server/tests/schema-integrity.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "schema-integrity-regression/1.0";
const RUN = `regress_si_${crypto.randomBytes(4).toString("hex")}`;

const created = { userIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createResident() {
  const id = `${RUN}_resident`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, 'Regression resident', $2, true, 'resident', false, false, false, NOW(), NOW())`,
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

async function createModule() {
  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'General', 'Schema integrity regression fixture', 'Beginner', '5 mins', 'published') RETURNING mod_id`,
    [RUN]
  );
  created.modIds.push(rows[0].mod_id);
  return rows[0].mod_id;
}

async function enroll(user, modId) {
  const res = await fetch(`${BASE_URL}/api/modules/${modId}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
  });
  return { status: res.status, body: await res.json() };
}

// True when some index on `table` has `column` as its first key column
async function hasLeadingIndex(table, column) {
  const { rows } = await pool.query(
    `SELECT 1 FROM pg_index i
     JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
     WHERE i.indrelid = $1::regclass AND a.attname = $2`,
    [table, column]
  );
  return rows.length > 0;
}

async function cleanup() {
  const { userIds, modIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM module_activity WHERE user_id = ANY($1) OR mod_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1)", [modIds]);
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
       (SELECT COUNT(*)::int FROM module_activity WHERE user_id = ANY($1)) AS enrollments`,
    [userIds, modIds]
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

  const resident = await createResident();
  const modId = await createModule();

  await check("simultaneous enroll requests create one enrollment", async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => enroll(resident, modId)));
    assert.ok(responses.every((r) => r.status === 200), JSON.stringify(responses.map((r) => r.status)));
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM module_activity WHERE user_id = $1 AND mod_id = $2",
      [resident.id, modId]
    );
    assert.equal(rows[0].n, 1);
  });

  await check("a question can't reference a missing step", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await assert.rejects(
        client.query(
          `INSERT INTO questions (mod_id, step_id, question_text, points, image_url)
           VALUES ($1, (SELECT COALESCE(MAX(step_id), 0) + 100000 FROM module_steps), 'orphan', 10, '')`,
          [modId]
        ),
        (err) => err.code === "23503"
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });

  for (const [table, column] of [
    ["questions", "step_id"],
    ["quiz_attempt_answers", "question_id"],
    ["quiz_attempts", "step_id"],
  ]) {
    await check(`${table}.${column} is indexed`, async () => {
      assert.equal(await hasLeadingIndex(table, column), true);
    });
  }

  await check("redundant single-column indexes are gone", async () => {
    const { rows } = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
       AND indexname IN ('idx_session_user_id', 'idx_module_data_parent_mod_id', 'idx_announcements_barangay_id')`
    );
    assert.deepEqual(rows.map((r) => r.indexname), []);
  });

  await check("the composite indexes that cover them remain", async () => {
    assert.equal(await hasLeadingIndex("session", "userId"), true);
    assert.equal(await hasLeadingIndex("module_data", "parent_mod_id"), true);
    assert.equal(await hasLeadingIndex("announcements", "barangay_id"), true);
  });

  if (failures.length) throw new Error(`${failures.length} check(s) failed`);
  console.log("All schema-integrity regression checks passed.");
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
