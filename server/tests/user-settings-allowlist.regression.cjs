/**
 * Regression test (audit P5-12, validation audit M5): PUT /api/users/me/settings merged the
 * request body into "user".settings with no key allowlist and no types, so
 * {junk: "x" * 600000, __proto__x: 1} or {reminders: "false"} were stored as sent.
 *
 * The keys the client writes (client/src):
 *   announcements, reminders  booleans (NotificationPreferences.jsx via useNotificationPreferences.js)
 *   theme                     "light" | "dark" | "system" (hooks/context/themeContext.jsx)
 *   lastSeenAnnouncementId    announcement id as a digit string (NotificationDropdown.jsx, String(id))
 * The client sends the whole settings object it last read back with one key changed, and the
 * offline queue (syncManager.js UPDATE_NOTIFICATION_SETTINGS) replays the same object.
 *
 * Asserts, over HTTP against a RUNNING LOCAL server:
 *   - every payload shape the client sends today is accepted and stored
 *   - unknown keys, wrong types, unknown theme, non-digit lastSeenAnnouncementId, arrays:
 *     400 with a message, and the stored settings are unchanged
 *   - GET returns only allowlisted keys, so a row holding legacy junk keys round-trips
 *     (GET, change one toggle, PUT the whole object) without a 400
 *
 * Fixtures are seeded in SQL and removed by exact id. Refuses non-loopback databases.
 * Run from the repo root:  node server/tests/user-settings-allowlist.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "user-settings-allowlist-regression/1.0";
const RUN = `regress_us_${crypto.randomBytes(4).toString("hex")}`;
const created = { userIds: [] };
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`not ok - ${name}: ${err.message.split("\n")[0]}`);
  }
}

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, settingsJson) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt"${settingsJson ? ", settings" : ""})
     VALUES ($1, $2, $3, true, 'resident', false, false, false, NOW(), NOW()${settingsJson ? ", $4::jsonb" : ""})`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, ...(settingsJson ? [settingsJson] : [])]
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

async function call(user, method, path, rawBody) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: rawBody,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const put = (user, body) => call(user, "PUT", "/api/users/me/settings", typeof body === "string" ? body : JSON.stringify(body));

async function stored(user) {
  const { rows } = await pool.query('SELECT settings FROM "user" WHERE id = $1', [user.id]);
  return rows[0].settings;
}

async function cleanup() {
  const ids = created.userIds;
  await pool.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [ids]);
  await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [ids]);
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE id = ANY($1)`, [ids]);
  console.log(`cleanup: ${rows[0].n} fixture users left`);
}

async function main() {
  await assertLocalDatabase();
  const user = await createUser("resident");
  const legacy = await createUser("legacy", JSON.stringify({ announcements: true, reminders: true, junk: "x".repeat(50), __proto__x: 1 }));

  // Payloads the client sends today
  const valid = [
    ["notification toggle (initialData shape)", { announcements: false, reminders: true }],
    ["theme only (themeContext)", { theme: "dark" }],
    ["theme system", { theme: "system" }],
    ["full object after GET (toggle + theme + last seen)", { announcements: true, reminders: false, theme: "light", lastSeenAnnouncementId: "42" }],
    ["partial reminders only", { reminders: true }],
  ];
  for (const [name, body] of valid) {
    await check(`accepted: ${name}`, async () => {
      const res = await put(user, body);
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const s = await stored(user);
      for (const [k, v] of Object.entries(body)) assert.equal(s[k], v, `stored ${k}`);
    });
  }

  const invalid = [
    ["unknown key", { announcements: true, junk: "x" }],
    ["600 KB unknown key", { junk: "x".repeat(600000) }],
    ["__proto__x key", { __proto__x: 1 }],
    ["announcements as string", { announcements: "false" }],
    ["reminders as number", { reminders: 0 }],
    ["reminders null", { reminders: null }],
    ["theme not in enum", { theme: "purple" }],
    ["theme as boolean", { theme: true }],
    ["lastSeenAnnouncementId as number", { lastSeenAnnouncementId: 42 }],
    ["lastSeenAnnouncementId not digits", { lastSeenAnnouncementId: "<b>1</b>" }],
    ["lastSeenAnnouncementId too long", { lastSeenAnnouncementId: "1".repeat(500) }],
    ["array body", [true]],
  ];
  for (const [name, body] of invalid) {
    await check(`rejected 400, nothing written: ${name}`, async () => {
      const before = await stored(user);
      const res = await put(user, body);
      assert.equal(res.status, 400, `status ${res.status}`);
      assert.equal(typeof res.body?.message, "string", "400 carries a message");
      assert.deepEqual(await stored(user), before, "stored settings changed");
    });
  }

  await check("GET returns only allowlisted keys (legacy junk hidden)", async () => {
    const res = await call(legacy, "GET", "/api/users/me/settings");
    assert.equal(res.status, 200);
    assert.deepEqual(Object.keys(res.body).sort(), ["announcements", "reminders"], JSON.stringify(res.body));
  });

  await check("legacy row: client round-trip (GET, toggle, PUT whole object) is accepted", async () => {
    const got = (await call(legacy, "GET", "/api/users/me/settings")).body;
    const res = await put(legacy, { ...got, announcements: false });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await stored(legacy)).announcements, false);
  });
}

main()
  .catch((err) => {
    failed++;
    console.error("not ok - run aborted:", err);
  })
  .finally(async () => {
    try { await cleanup(); } catch (e) { failed++; console.error("cleanup failed:", e.message); }
    await pool.end();
    console.log(failed ? `FAILED (${failed})` : "PASS");
    process.exit(failed ? 1 : 0);
  });
