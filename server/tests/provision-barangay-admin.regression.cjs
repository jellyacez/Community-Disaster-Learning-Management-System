/**
 * Regression test: a provisioned barangay_admin was stored with no barangay.
 *
 * POST /api/admin/users/provision took the barangay NAME the client sends, passed it to Better Auth
 * as an unknown `data.barangay` field, and never set `user.barangay_id`. Every barangay-scoped
 * endpoint then failed for that admin (residents 500, analytics 400 NO_BARANGAY_SELECTED).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that:
 *   - provisioning with a barangay name stores that barangay's id
 *   - provisioning with a numeric barangay id stores that id
 *   - the new admin can load the resident registry (it was a 500)
 *   - an unknown barangay is refused with 400 and creates no account
 *   - a non-barangay role is still stored with no barangay
 *
 * Fixtures (a provisioning admin and its session) are seeded directly into the database from
 * server/.env; the provisioned accounts are removed by email. Refuses to run unless the database
 * is on loopback.
 *
 * Run from the repo root:  node server/tests/provision-barangay-admin.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "provision-barangay-admin-regression/1.0";
const RUN = `regress_pv_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;

const created = { userIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

// Direct session so no password or MFA flow is needed; admin roles require twoFactorEnabled
async function createSession(id, role) {
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, NOW(), NOW())`,
    [id, `Regression ${role}`, `${id}@${EMAIL_DOMAIN}`, role]
  );
  created.userIds.push(id);
  return sessionFor(id);
}

async function sessionFor(id) {
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

async function call(session, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: session.cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function userByEmail(email) {
  const { rows } = await pool.query(`SELECT id, role, barangay_id FROM "user" WHERE email = $1`, [email]);
  if (rows[0]) created.userIds.push(rows[0].id);
  return rows[0];
}

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM "user" WHERE email LIKE $1`, [`%@${EMAIL_DOMAIN}`]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [created.userIds]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
    await client.query(`DELETE FROM account WHERE "userId" = ANY($1)`, [created.userIds]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE email LIKE $1`, [`%@${EMAIL_DOMAIN}`]);
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.equal(rows[0].n, 0, "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const provisioner = await createSession(`${RUN}_mdrrmo`, "mdrrmo_admin");
  const check = async (name, fn) => {
    await fn();
    console.log(`ok - ${name}`);
  };

  const { rows: bRows } = await pool.query("SELECT id, name FROM barangays ORDER BY id LIMIT 2");
  assert.equal(bRows.length, 2, "need two barangays in the database");
  const [first, second] = bRows;

  let byName;
  await check("provisioning with a barangay name stores that barangay's id", async () => {
    const email = `name@${EMAIL_DOMAIN}`;
    const res = await call(provisioner, "POST", "/api/admin/users/provision", {
      name: "Regression Name", email, role: "barangay_admin", barangay: first.name,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    byName = await userByEmail(email);
    assert.equal(byName.role, "barangay_admin");
    assert.equal(byName.barangay_id, first.id);
  });

  await check("provisioning with a numeric barangay id stores that id", async () => {
    const email = `id@${EMAIL_DOMAIN}`;
    const res = await call(provisioner, "POST", "/api/admin/users/provision", {
      name: "Regression Id", email, role: "barangay_admin", barangay: String(second.id),
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal((await userByEmail(email)).barangay_id, second.id);
  });

  await check("the provisioned admin can load the resident registry", async () => {
    const session = await sessionFor(byName.id);
    // The account is created without 2FA; the flag stands in for an enrolled second factor
    await pool.query(`UPDATE "user" SET "twoFactorEnabled" = true WHERE id = $1`, [byName.id]);
    const res = await call(session, "GET", "/api/admin/residents?page=1&limit=10");
    assert.equal(res.status, 200, JSON.stringify(res.body));
  });

  await check("an unknown barangay is refused and creates no account", async () => {
    const email = `bad@${EMAIL_DOMAIN}`;
    const res = await call(provisioner, "POST", "/api/admin/users/provision", {
      name: "Regression Bad", email, role: "barangay_admin", barangay: "Not A Barangay",
    });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal(await userByEmail(email), undefined);
  });

  await check("a non-barangay role is still stored with no barangay", async () => {
    // mdrrmo_admin may provision only barangay_admin, so use a rank above for this one
    const head = await createSession(`${RUN}_head`, "head_mdrrmo_admin");
    const email = `mdrrmo@${EMAIL_DOMAIN}`;
    const res = await call(head, "POST", "/api/admin/users/provision", {
      name: "Regression Mdrrmo", email, role: "mdrrmo_admin",
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal((await userByEmail(email)).barangay_id, null);
  });

  console.log("All provisioning regression checks passed.");
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
