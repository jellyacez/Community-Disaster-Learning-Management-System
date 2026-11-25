/**
 * Regression test: admin provisioning stored any name (review L4).
 *
 * Sign-up names go through utils/personName.js (letters, marks, spaces, apostrophes, hyphens and
 * periods; no digits; at least one letter; NFC, trimmed, inner whitespace collapsed). POST
 * /api/admin/users/provision only checked `!name`, so a whitespace-only name, digits, symbols,
 * control or bidi characters and any length went into "user".name and the credentials email.
 *
 * Drives the real controller in-process (body through the real sanitizeMiddleware, mail stubbed so
 * nothing is sent) and asserts that:
 *   - each name sign-up's rule refuses is a 400 with the validator's message, creates no user row
 *     and sends no email
 *   - a valid name is a 201 and is stored normalized the way sign-up stores it
 *   - a name of 302 characters (the longest sign-up can derive) is accepted, 303 is refused
 * Plus one real HTTP request to a RUNNING LOCAL server: the route refuses a bad name with 400.
 *
 * Fixtures (a system_admin and its session) are seeded directly into the database; provisioned
 * accounts are removed by email domain, fixtures by exact id. Refuses to run unless the database is
 * on loopback.
 *
 * Run from the repo root:  node server/tests/provision-name-validation.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");

// Stub outgoing mail before anything that captures the transporter is loaded.
const { transporter } = require("../utils/mailer");
const sent = [];
transporter.sendMail = async (mail) => {
  sent.push(mail);
  return { stubbed: true };
};

const pool = require("../config/db");
const { auth } = require("../utils/auth");
const sanitizeMiddleware = require("../middleware/sanitizeMiddleware");
const { provisionAdmin } = require("../controllers/admin/user-management/provisionAdmin");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "provision-name-validation-regression/1.0";
const RUN = `regress_pn_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;

const created = { userIds: [] };
let failures = 0;

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

// Direct session so no password or MFA flow is needed; admin roles require twoFactorEnabled
async function createAdmin() {
  const id = `${RUN}_sys`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, 'Regression System Admin', $2, true, 'system_admin', true, false, false, NOW(), NOW())`,
    [id, `${id}@${EMAIL_DOMAIN}`]
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
  return {
    user: { id, role: "system_admin" },
    cookie: `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}`,
  };
}

function callHandler(handler, { body, user }) {
  return new Promise((resolve, reject) => {
    const req = { body, params: {}, query: {}, headers: {}, user, ip: "127.0.0.1" };
    sanitizeMiddleware(req, {}, () => {});
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

async function userByEmail(email) {
  const { rows } = await pool.query(`SELECT id, name FROM "user" WHERE email = $1`, [email]);
  if (rows[0]) created.userIds.push(rows[0].id);
  return rows[0];
}

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failures++;
    console.log(`not ok - ${name}\n    ${err.message}`);
  }
}

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`SELECT id FROM "user" WHERE email LIKE $1`, [`%@${EMAIL_DOMAIN}`]);
    const ids = [...new Set([...created.userIds, ...rows.map((r) => r.id)])];
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [ids]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [ids]);
    await client.query(`DELETE FROM account WHERE "userId" = ANY($1)`, [ids]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [ids]);
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

// Each of these is refused by sign-up's per-part rule (utils/personName.js)
const REFUSED = [
  ["whitespace only", "   \t  "],
  ["no letter", "..."],
  ["digits", "Juan Cruz 3rd"],
  ["ampersand", "Juan & Co"],
  ["at sign", "Juan@Cruz"],
  ["markup character left by the sanitizer", "Juan < Cruz"],
  ["control character", "Juan\u0007Cruz"],
  ["NUL", "Juan\u0000Cruz"],
  ["bidi override", "Juan‮Cruz"],
  ["bidi isolate", "Juan⁦Cruz"],
  ["zero-width space", "Juan​Cruz"],
  ["303 characters", "A".repeat(303)],
  ["a number, not text", 12345],
  ["an array, not text", ["Juan", "Cruz"]],
];

async function main() {
  await assertLocalDatabase();
  const admin = await createAdmin();
  let n = 0;

  for (const [label, name] of REFUSED) {
    await check(`provisioning refuses a name with ${label}: 400, no account, no email`, async () => {
      const email = `bad${++n}@${EMAIL_DOMAIN}`;
      sent.length = 0;
      const res = await callHandler(provisionAdmin, { body: { name, email, role: "mdrrmo_admin" }, user: admin.user });
      const row = await userByEmail(email);
      assert.equal(res.status, 400, `status ${res.status} ${JSON.stringify(res.body)}`);
      assert.match(res.body?.message ?? "", /name/i, JSON.stringify(res.body));
      assert.equal(row, undefined, `user row created with name ${JSON.stringify(row?.name)}`);
      assert.equal(sent.length, 0, `${sent.length} email(s) sent`);
    });
  }

  await check("a valid name is provisioned and stored normalized, as sign-up stores it", async () => {
    const email = `good@${EMAIL_DOMAIN}`;
    sent.length = 0;
    // NFD "e" + combining acute, padded and with doubled inner spaces
    const res = await callHandler(provisionAdmin, {
      body: { name: "  José   Dela  Cruz-O’Brien Jr.  ", email, role: "mdrrmo_admin" },
      user: admin.user,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const row = await userByEmail(email);
    assert.equal(row?.name, "José Dela Cruz-O’Brien Jr.");
    assert.equal(res.body.user.name, "José Dela Cruz-O’Brien Jr.");
    assert.equal(sent.length, 1, "credentials email not sent");
  });

  await check("a 302-character name (the longest sign-up can derive) is accepted", async () => {
    const email = `long@${EMAIL_DOMAIN}`;
    const name = `${"A".repeat(100)} ${"B".repeat(100)} ${"C".repeat(100)}`;
    const res = await callHandler(provisionAdmin, { body: { name, email, role: "mdrrmo_admin" }, user: admin.user });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal((await userByEmail(email))?.name, name);
  });

  await check("the route refuses a bad name over HTTP with 400 and creates no account", async () => {
    const email = `http@${EMAIL_DOMAIN}`;
    const res = await fetch(`${BASE_URL}/api/admin/users/provision`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: admin.cookie },
      body: JSON.stringify({ name: "Juan‮Cruz 2", email, role: "mdrrmo_admin" }),
    });
    const body = await res.json().catch(() => null);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.equal(await userByEmail(email), undefined);
  });

  if (failures) throw new Error(`${failures} check(s) failed`);
  console.log("All provisioning name checks passed.");
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
