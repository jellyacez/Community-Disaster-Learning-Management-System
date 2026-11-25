/**
 * Regression test: branding on a database shaped like production (docs/specs/branding.md).
 *
 * Production's system_settings has only broadcast_active, broadcast_message, broadcast_severity,
 * emergency_contacts_version and maintenance_mode: deploys run migration.sql, never seed.sql, and nobody
 * has saved branding or organization details. This test reduces system_settings to exactly those five
 * keys and asserts, against a RUNNING LOCAL API:
 *   1. with no branding_version row: the public read gives "Bacolor Disaster LMS", no logo, an integer
 *      version; the admin reads the two cards use return no saved values (the cards show their defaults);
 *      emails carry the default footer, the default name and no Reply-To
 *   2. migration.sql adds branding_version = 1 and nothing else, idempotently (twice)
 *   3. the first save of each card upserts its rows; the public read reflects the branding save at once
 *      (cache refresh) with a higher version; later admin reads and emails return the saved values
 *
 * The API caches the public read for 60 s in process, so step 1 waits up to 65 s for values cached
 * before the rows were deleted to expire. Outgoing mail is stubbed in this process. The original
 * system_settings rows are restored at the end. Refuses non-loopback databases and LMS_db.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> TEST_BASE_URL=http://localhost:<port> node server/tests/branding-prod-shape.regression.cjs
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
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
const { sendAccountNotice } = require("../services/accountNoticeService");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "branding-prod-shape-regression/1.0";
const RUN = `regress_brp_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;
const PROD_KEYS = ["broadcast_active", "broadcast_message", "broadcast_severity", "emergency_contacts_version", "maintenance_mode"];
const DEFAULT_NAME = "Bacolor Disaster LMS";
const DEFAULT_FOOTER = "Community DRRM System - Bacolor, Pampanga.";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

const created = { userIds: [] };
let snapshot = null;
const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`ok - ${name}`);
  } catch (err) {
    results.push(false);
    console.log(`not ok - ${name}\n      ${err.message.split("\n")[0]}`);
  }
}

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

async function createUser(role) {
  const id = `${RUN}_${role}`;
  const email = `${id}@${EMAIL_DOMAIN}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, NOW(), NOW())`,
    [id, `Prod Shape ${role}`, email, role]
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
  return { id, email, name: `Prod Shape ${role}`, cookie: `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}` };
}

async function call(session, method, p, body) {
  const headers = { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA };
  if (session) headers.Cookie = session.cookie;
  const res = await fetch(`${BASE_URL}${p}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function keys() {
  const { rows } = await pool.query("SELECT key, value FROM system_settings ORDER BY key");
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

async function resetMail(user) {
  sent.length = 0;
  await auth.options.emailAndPassword.sendResetPassword({ user, token: "tok" });
  return sent.find((m) => m.to === user.email && /Reset/.test(m.subject));
}

async function main() {
  await assertScratchDatabase();
  if (!process.env.EMAIL_USER) throw new Error("EMAIL_USER must be set (server/.env) for the From check");
  snapshot = (await pool.query("SELECT key, value FROM system_settings")).rows;
  const admin = await createUser("system_admin");
  const resident = await createUser("resident");

  // Production shape: exactly the five keys (values kept)
  await pool.query("DELETE FROM system_settings WHERE NOT (key = ANY($1))", [PROD_KEYS]);
  for (const key of PROD_KEYS) {
    await pool.query("INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING", [key, key === "emergency_contacts_version" ? "1" : key === "broadcast_active" || key === "maintenance_mode" ? "false" : ""]);
  }

  await check("setup: system_settings has exactly the five production keys", async () => {
    assert.deepEqual(Object.keys(await keys()).sort(), [...PROD_KEYS].sort());
  });

  console.log("\n1. no branding rows, no branding_version");
  await check("public read: default name, no logo, integer version (waits out the API's 60 s cache)", async () => {
    let body;
    const until = Date.now() + 65000;
    do {
      body = (await call(null, "GET", "/api/public/branding")).body;
      if (body?.name === DEFAULT_NAME && body.logo === null) break;
      await new Promise((r) => setTimeout(r, 2000));
    } while (Date.now() < until);
    assert.equal(body.name, DEFAULT_NAME);
    assert.equal(body.logo, null);
    assert.ok(Number.isInteger(body.version) && body.version >= 1, `version ${JSON.stringify(body.version)}`);
  });

  await check("logo endpoint 404s", async () => {
    const res = await fetch(`${BASE_URL}/api/public/branding/logo`, { headers: { "User-Agent": UA } });
    assert.equal(res.status, 404);
  });

  await check("Branding and Organization cards: admin reads return no saved values (cards show defaults)", async () => {
    const settings = await call(admin, "GET", "/api/admin/settings");
    assert.equal(settings.status, 200);
    for (const k of ["system_name", "support_email", "org_footer_text"]) assert.equal(settings.body.data[k], undefined, k);
    assert.equal(settings.body.data.maintenance_mode, "false");
    const logo = await call(admin, "GET", "/api/admin/settings/logo");
    assert.equal(logo.status, 200);
    assert.deepEqual(logo.body.data, { system_logo: null, logo_supported: true });
  });

  await check("emails: default name, default footer, From EMAIL_USER, no Reply-To", async () => {
    const mail = await resetMail(resident);
    assert.ok(mail, "no reset mail");
    assert.equal(mail.subject, `Reset Your Password - ${DEFAULT_NAME}`);
    assert.deepEqual(mail.from, { name: `${DEFAULT_NAME} Security`, address: process.env.EMAIL_USER });
    assert.equal(mail.replyTo, undefined);
    assert.ok(mail.html.includes(DEFAULT_FOOTER), "default footer missing");
    sent.length = 0;
    await sendAccountNotice(resident.id, "banned", { reason: "x" });
    const notice = sent.find((m) => m.to === resident.email);
    assert.ok(notice.html.includes(`mailto:${process.env.EMAIL_USER}`), "contact line should fall back to EMAIL_USER");
    assert.equal(notice.replyTo, undefined);
  });

  console.log("\n2. migration.sql on the production shape");
  await check("migration.sql (run twice) adds branding_version = 1 and nothing else", async () => {
    const sql = fs.readFileSync(path.join(__dirname, "..", "migrations", "migration.sql"), "utf8");
    await pool.query(sql);
    await pool.query(sql);
    const after = await keys();
    assert.deepEqual(Object.keys(after).sort(), [...PROD_KEYS, "branding_version"].sort());
    assert.equal(after.branding_version, "1");
  });

  await check("public read still gives the defaults after the migration", async () => {
    const body = (await call(null, "GET", "/api/public/branding")).body;
    assert.equal(body.name, DEFAULT_NAME);
    assert.equal(body.logo, null);
  });

  console.log("\n3. first save of each card");
  await check("first Branding save upserts name and logo; public read refreshes at once with a higher version", async () => {
    const before = (await call(null, "GET", "/api/public/branding")).body.version;
    const r = await call(admin, "PATCH", "/api/admin/settings/branding", {
      system_name: "Prod Shape LMS",
      system_logo: `data:image/png;base64,${PNG.toString("base64")}`,
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const k = await keys();
    assert.equal(k.system_name, "Prod Shape LMS");
    assert.ok(k.system_logo?.startsWith("data:image/png;base64,"), "logo row missing");
    assert.equal(k.branding_version, "2");
    const pub = (await call(null, "GET", "/api/public/branding")).body;
    assert.equal(pub.name, "Prod Shape LMS");
    assert.ok(pub.version > before, `version ${pub.version} not above ${before}`);
    assert.equal(pub.logo?.url, `/api/public/branding/logo?v=${pub.version}`);
    const img = await fetch(`${BASE_URL}${pub.logo.url}`, { headers: { "User-Agent": UA } });
    assert.equal(img.status, 200);
    assert.ok(Buffer.from(await img.arrayBuffer()).equals(PNG));
  });

  await check("first Organization save upserts support email and footer", async () => {
    const r = await call(admin, "PATCH", "/api/admin/settings/organization", {
      support_email: "help@prod-shape.example.org",
      org_footer_text: "Bacolor MDRRMO, Pampanga",
    });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const k = await keys();
    assert.equal(k.support_email, "help@prod-shape.example.org");
    assert.equal(k.org_footer_text, "Bacolor MDRRMO, Pampanga");
  });

  await check("later reads return the saved values (both cards)", async () => {
    const settings = (await call(admin, "GET", "/api/admin/settings")).body.data;
    assert.equal(settings.system_name, "Prod Shape LMS");
    assert.equal(settings.support_email, "help@prod-shape.example.org");
    assert.equal(settings.org_footer_text, "Bacolor MDRRMO, Pampanga");
    const logo = (await call(admin, "GET", "/api/admin/settings/logo")).body.data;
    assert.equal(logo.logo_supported, true);
    assert.ok(logo.system_logo?.startsWith("data:image/png;base64,"));
  });

  await check("emails after the saves: saved name and footer, Reply-To the support email", async () => {
    const mail = await resetMail(resident);
    assert.equal(mail.subject, "Reset Your Password - Prod Shape LMS");
    assert.deepEqual(mail.from, { name: "Prod Shape LMS Security", address: process.env.EMAIL_USER });
    assert.equal(mail.replyTo, "help@prod-shape.example.org");
    assert.ok(mail.html.includes("Bacolor MDRRMO, Pampanga"), "saved footer missing");
  });

  await check("a second Branding save updates in place (no duplicate rows) and bumps the version again", async () => {
    const r = await call(admin, "PATCH", "/api/admin/settings/branding", { system_name: "Prod Shape LMS Two" });
    assert.equal(r.status, 200);
    const { rows } = await pool.query("SELECT key, COUNT(*)::int AS n FROM system_settings GROUP BY key HAVING COUNT(*) > 1");
    assert.deepEqual(rows, []);
    const k = await keys();
    assert.equal(k.system_name, "Prod Shape LMS Two");
    assert.equal(k.branding_version, "3");
    assert.equal((await call(null, "GET", "/api/public/branding")).body.name, "Prod Shape LMS Two");
  });
}

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (snapshot) {
      await client.query("DELETE FROM system_settings");
      for (const { key, value } of snapshot) {
        await client.query("INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())", [key, value]);
      }
      // only ever forward, so clients never mistake the restored state for a cached one
      await client.query(`UPDATE system_settings SET value = (value::int + 1000)::text WHERE key = 'branding_version' AND value ~ '^[0-9]{1,6}$'`);
    }
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [created.userIds]);
    await client.query("DELETE FROM user_notification WHERE user_id = ANY($1)", [created.userIds]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log(`cleanup error: ${err.message}`);
  } finally {
    client.release();
  }
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE id LIKE $1`, [`${RUN}%`]);
  console.log(`remaining fixture users: ${rows[0].n}`);
}

main()
  .catch((err) => {
    results.push(false);
    console.log(`ERROR ${err.stack}`);
  })
  .finally(async () => {
    await cleanup();
    const failed = results.filter((r) => !r).length;
    console.log(`\n${results.length - failed} passed, ${failed} failed`);
    await pool.end().catch(() => {});
    process.exit(failed ? 1 : 0);
  });
