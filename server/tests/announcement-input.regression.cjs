/**
 * Regression test: announcement create took any target barangay and unbounded content (audit M14).
 *
 * POST /api/admin/barangay/announcements and POST /api/admin/mdrrmo/announcements both run
 * announcementSchema, but target_barangay_id was only "a positive integer", so a barangay that
 * does not exist (99999) hit the barangay_id foreign key and one past int4 (2147483648) overflowed
 * the column, each a 500. A super admin's X-Barangay-Scope header went through parseInt unchecked
 * ("abc" -> NaN -> 500). content had no maximum, so a message of any size up to the 800 kb body
 * limit was stored and pushed to every SSE client. Now the target must be an existing barangay
 * (else a 400 that stores nothing) and content is capped at 5000 characters, the composer's limit.
 * Valid payloads the composer sends still save, and a barangay admin still posts to their own
 * barangay whatever target they send.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Users and sessions are seeded directly into
 * the database; they and their announcements are removed by exact ID in `finally`. Refuses a
 * non-loopback database.
 *
 * Run from the repo root:  node server/tests/announcement-input.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "announcement-input-regression/1.0";
const RUN = `regress_ann_${crypto.randomBytes(4).toString("hex")}`;
const BARANGAY_ID = 1;
const OTHER_BARANGAY_ID = 2;
const MAX_CONTENT = 5000;

const BRGY_PATH = "/api/admin/barangay/announcements";
const MDRRMO_PATH = "/api/admin/mdrrmo/announcements";

const created = { userIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role, barangayId = null) {
  const id = `${RUN}_${label}`;
  // Admin roles require MFA; the flag stands in for an enrolled second factor
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, barangay_id, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, $5, true, false, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, role, barangayId]
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

async function post(user, path, body, extraHeaders = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": UA,
      Cookie: user.cookie,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const storedBy = async (user) =>
  (
    await pool.query(
      `SELECT id, title, length(content) AS content_length, priority, barangay_id, expires_at
       FROM announcements WHERE author_id = $1 ORDER BY id`,
      [user.id]
    )
  ).rows;

async function cleanup() {
  const { userIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM announcements WHERE author_id = ANY($1)", [userIds]);
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
       (SELECT COUNT(*)::int FROM announcements WHERE author_id = ANY($1)) AS announcements`,
    [userIds]
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

  // adminWriteLimiter allows 20 writes per admin per 15 minutes, so each group gets its own admin
  let n = 0;
  const fresh = (role, barangayId = null) => createUser(`${role}${++n}`, role, barangayId);

  const base = { title: `${RUN} advisory`, content: "Evacuate to the covered court.", priority: "standard", duration_hours: null };

  const refuses = async (user, path, body, headers) => {
    const before = (await storedBy(user)).length;
    const res = await post(user, path, body, headers);
    assert.equal(res.status, 400, `status ${res.status}: ${JSON.stringify(res.body)?.slice(0, 200)}`);
    const text = res.body?.message || res.body?.error;
    assert.equal(typeof text, "string", `no message: ${JSON.stringify(res.body)}`);
    assert.equal((await storedBy(user)).length, before, "a row was stored");
  };

  // target_barangay_id must name an existing barangay (MDRRMO route; the barangay route shares the schema)
  const mdrrmoBad = await fresh("mdrrmo_admin");
  for (const target of [99999, "99999", 2147483647, 2147483648, 99999999999, "abc", 1.5, -1, 0]) {
    await check(`mdrrmo: target_barangay_id ${JSON.stringify(target)} is a 400 that stores nothing`, () =>
      refuses(mdrrmoBad, MDRRMO_PATH, { ...base, target_barangay_id: target })
    );
  }

  // content is capped at the composer's 5000 characters on both routes
  const mdrrmoLen = await fresh("mdrrmo_admin");
  const brgyLen = await fresh("barangay_admin", BARANGAY_ID);
  for (const [who, user, path] of [["mdrrmo", mdrrmoLen, MDRRMO_PATH], ["barangay", brgyLen, BRGY_PATH]]) {
    await check(`${who}: content of ${MAX_CONTENT + 1} characters is a 400 that stores nothing`, () =>
      refuses(user, path, { ...base, content: "a".repeat(MAX_CONTENT + 1), target_barangay_id: null })
    );
    await check(`${who}: content of 700000 characters is a 400 that stores nothing`, () =>
      refuses(user, path, { ...base, content: "a".repeat(700000), target_barangay_id: null })
    );
    await check(`${who}: a 256-character title is a 400 that stores nothing`, () =>
      refuses(user, path, { ...base, title: "t".repeat(256), target_barangay_id: null })
    );
  }

  // a super admin's barangay scope header must name an existing barangay too
  const superBad = await fresh("super_admin");
  for (const scope of ["abc", "99999", "2147483648"]) {
    await check(`super admin: X-Barangay-Scope ${scope} is a 400 that stores nothing`, () =>
      refuses(superBad, BRGY_PATH, { ...base, target_barangay_id: null }, { "x-barangay-scope": scope })
    );
  }

  // what the composer sends still saves
  const mdrrmoOk = await fresh("mdrrmo_admin");
  await check(`mdrrmo: a targeted urgent advisory with ${MAX_CONTENT}-character content and a 255-character title saves`, async () => {
    const title = `${RUN}`.padEnd(255, "x");
    const res = await post(mdrrmoOk, MDRRMO_PATH, {
      title,
      content: "c".repeat(MAX_CONTENT),
      priority: "urgent",
      duration_hours: 24,
      target_barangay_id: String(OTHER_BARANGAY_ID),
    });
    assert.equal(res.status, 201, JSON.stringify(res.body)?.slice(0, 200));
    const row = (await storedBy(mdrrmoOk)).at(-1);
    assert.equal(row.title, title);
    assert.equal(row.content_length, MAX_CONTENT);
    assert.equal(row.barangay_id, OTHER_BARANGAY_ID);
    assert.equal(row.priority, "urgent");
    assert.ok(row.expires_at, "urgent advisory has no expiry");
  });
  for (const target of [null, ""]) {
    await check(`mdrrmo: target_barangay_id ${JSON.stringify(target)} posts municipality-wide`, async () => {
      const res = await post(mdrrmoOk, MDRRMO_PATH, { ...base, target_barangay_id: target });
      assert.equal(res.status, 201, JSON.stringify(res.body)?.slice(0, 200));
      assert.equal((await storedBy(mdrrmoOk)).at(-1).barangay_id, null);
    });
  }
  await check("mdrrmo: a numeric target_barangay_id of an existing barangay saves to it", async () => {
    const res = await post(mdrrmoOk, MDRRMO_PATH, { ...base, target_barangay_id: BARANGAY_ID });
    assert.equal(res.status, 201, JSON.stringify(res.body)?.slice(0, 200));
    assert.equal((await storedBy(mdrrmoOk)).at(-1).barangay_id, BARANGAY_ID);
  });

  const brgyOk = await fresh("barangay_admin", BARANGAY_ID);
  for (const target of [null, OTHER_BARANGAY_ID]) {
    await check(`barangay admin: target_barangay_id ${JSON.stringify(target)} still posts to their own barangay`, async () => {
      const res = await post(brgyOk, BRGY_PATH, { ...base, target_barangay_id: target });
      assert.equal(res.status, 201, JSON.stringify(res.body)?.slice(0, 200));
      assert.equal((await storedBy(brgyOk)).at(-1).barangay_id, BARANGAY_ID);
    });
  }

  const superOk = await fresh("super_admin");
  await check("super admin: an existing X-Barangay-Scope posts to that barangay", async () => {
    const res = await post(superOk, BRGY_PATH, { ...base, target_barangay_id: null }, { "x-barangay-scope": String(OTHER_BARANGAY_ID) });
    assert.equal(res.status, 201, JSON.stringify(res.body)?.slice(0, 200));
    assert.equal((await storedBy(superOk)).at(-1).barangay_id, OTHER_BARANGAY_ID);
  });
  await check("super admin: no scope header posts municipality-wide", async () => {
    const res = await post(superOk, BRGY_PATH, { ...base, target_barangay_id: null });
    assert.equal(res.status, 201, JSON.stringify(res.body)?.slice(0, 200));
    assert.equal((await storedBy(superOk)).at(-1).barangay_id, null);
  });

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):\n  - ${failures.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    console.log("All announcement input regression checks passed.");
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
