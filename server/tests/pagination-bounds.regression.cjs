/**
 * Regression test: list endpoints returned 500 for page=0, a negative or non-numeric page/limit,
 * or a page so large that OFFSET left the bigint range (audit P5-13).
 *
 * Each list endpoint parsed page/limit on its own; several let 0, negatives, NaN or a huge
 * offset reach Postgres as LIMIT/OFFSET. Bad values are now clamped (never a new 400, so no
 * client request that works today starts failing): page >= 1, 1 <= limit <= the endpoint's max,
 * missing/non-numeric/0 falls back to the endpoint's default, and page is capped so the offset
 * stays a safe integer.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. For every list endpoint and each bad input
 * it asserts 200, a row array no longer than meta.limit, an integer meta.page >= 1 and an integer
 * meta.limit in [1, max], plus the exact clamp result where one is defined. A normal page/limit
 * must still be honoured, and limit=99999 must come back as the endpoint's max.
 *
 * Fixtures (users, sessions) are seeded directly into the database from server/.env and removed
 * by exact ID in `finally`. Refuses to run unless the database is on loopback.
 *
 * Run from the repo root:  node server/tests/pagination-bounds.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "pagination-bounds-regression/1.0";
const RUN = `regress_pg_${crypto.randomBytes(4).toString("hex")}`;

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
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, barangay_id, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, $5, NOW(), NOW())`,
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

async function get(user, path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// Each endpoint keeps its own default and max limit; rows/meta keys differ per response shape
const ENDPOINTS = [
  { path: "/api/admin/activity-log", who: "sys", def: 20, max: 100, rows: "data", meta: "meta" },
  { path: "/api/admin/mdrrmo/activity-log", who: "sys", def: 20, max: 100, rows: "data", meta: "meta" },
  { path: "/api/admin/super/activity-log", who: "sys", def: 20, max: 100, rows: "data", meta: "meta" },
  { path: "/api/admin/barangay/activity-log", who: "brgy", def: 50, max: 100, rows: "data", meta: "meta" },
  { path: "/api/admin/barangay/certifications", who: "brgy", def: 10, max: 100, rows: "data", meta: "meta" },
  { path: "/api/admin/mdrrmo/certifications/feed", who: "sys", def: 10, max: 100, rows: "data.certificates", meta: "data.pagination" },
  { path: "/api/admin/residents", who: "sys", def: 10, max: 100, rows: "data", meta: "meta" },
  { path: "/api/users", who: "sys", def: 10, max: 100, rows: "data", meta: "meta" },
  { path: "/api/admin/modules", who: "sys", def: 10, max: 100, rows: "data", meta: "meta" },
  { path: "/api/admin/mdrrmo/feedback", who: "mdr", def: 10, max: 50, rows: "data", meta: "meta" },
  { path: "/api/users/announcements", who: "res", def: 5, max: 100, rows: "announcements", meta: "pagination" },
];

// [query, expected meta.page (undefined = only sane), expected meta.limit ("def"/"max"/number/undefined), expect empty rows]
const CASES = [
  ["page=0", 1, "def"],
  ["page=-1", 1, "def"],
  ["page=abc", 1, "def"],
  ["page=abc&limit=xyz", 1, "def"],
  ["limit=0", 1, "def"],
  ["limit=-5", 1, 1],
  ["limit=99999", 1, "max"],
  ["page=1&page=2", undefined, "def"],
  ["limit=5&limit=7", 1, undefined],
  ["page=1e9", undefined, "def"],
  ["page=2.5", undefined, "def"],
  [`page=${encodeURIComponent("  3")}`, undefined, "def"],
  ["page=0x10", undefined, "def"],
  ["page=99999999999&limit=100", undefined, "max", true],
  ["page=100000000000000000&limit=100", undefined, "max", true],
  [`page=${"9".repeat(400)}`, undefined, "def", true],
  ["page=1&limit=2", 1, 2],
  ["page=2&limit=1", 2, 1],
];

function checkResponse(ep, query, res, expPage, expLimit, expectEmpty) {
  assert.equal(res.status, 200, `status ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
  const pick = (p) => p.split(".").reduce((o, k) => o?.[k], res.body);
  const rows = pick(ep.rows);
  const meta = pick(ep.meta);
  assert.ok(Array.isArray(rows), `no ${ep.rows} array`);
  assert.ok(meta, `no ${ep.meta} object`);
  assert.ok(Number.isSafeInteger(meta.page) && meta.page >= 1, `meta.page=${JSON.stringify(meta.page)}`);
  assert.ok(Number.isSafeInteger(meta.limit) && meta.limit >= 1 && meta.limit <= ep.max, `meta.limit=${JSON.stringify(meta.limit)}`);
  assert.ok(rows.length <= meta.limit, `${rows.length} rows > limit ${meta.limit}`);
  if (expPage !== undefined) assert.equal(meta.page, expPage, "meta.page");
  const want = expLimit === "def" ? ep.def : expLimit === "max" ? ep.max : expLimit;
  if (want !== undefined) assert.equal(meta.limit, want, "meta.limit");
  if (expectEmpty) assert.equal(rows.length, 0, "huge page returned rows");
}

async function cleanup() {
  const { userIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS users FROM "user" WHERE id = ANY($1)`, [userIds]);
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.equal(rows[0].users, 0, "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const failures = [];
  try {
    const users = {
      sys: await createUser("super", "super_admin"),
      // super_admin gets 403 from the feedback inbox (FeedbackService scopes by mdrrmo/system/barangay roles)
      mdr: await createUser("mdr", "mdrrmo_admin"),
      brgy: await createUser("brgy", "barangay_admin", 1),
      res: await createUser("res", "resident", 1),
    };

    for (const ep of ENDPOINTS) {
      for (const [query, expPage, expLimit, expectEmpty] of CASES) {
        const name = `GET ${ep.path}?${query.length > 60 ? query.slice(0, 40) + "..." : query}`;
        try {
          const res = await get(users[ep.who], `${ep.path}?${query}`);
          checkResponse(ep, query, res, expPage, expLimit, expectEmpty);
          console.log(`ok - ${name}`);
        } catch (err) {
          failures.push(name);
          console.log(`not ok - ${name}: ${err.message.split("\n")[0]}`);
        }
      }
    }
  } finally {
    await cleanup();
    await pool.end();
  }

  if (failures.length) {
    console.log(`\n${failures.length} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nall ${ENDPOINTS.length * CASES.length} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
