/**
 * Regression test for audit finding P0-28 / KNOWN item 9: authenticate() revoked a session on ANY
 * user-agent difference, so a Chrome auto-update or DevTools device mode signed people out.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server with a session cookie whose stored userAgent
 * is seeded directly, and asserts that:
 *   a) identical UA -> 200
 *   b) browser version change only (Chrome, Firefox, Edge) -> 200, session kept, no revoke
 *   c) same browser on another OS (Chrome Windows <-> Android) -> 200, session kept, the change is
 *      logged as session_client_change_noted with a reason and old/new normalized values
 *   d) different browser family (Chrome -> Firefox) -> 401 SESSION_BROWSER_CHANGED, session deleted,
 *      session_hijack_attempt_detected logged
 *   e) missing or empty request UA -> 200 and no revoke (the header is trivially absent for some
 *      clients and proves nothing), logged with reason ua_missing
 *   f) a session stored before this change (full raw UA, odd shapes) still works across a version change
 * plus unit checks of utils/userAgent.js.
 *
 * Fixtures are seeded from server/.env and deleted by exact id. Refuses to run unless the database is
 * on loopback, and refuses LMS_db: point DB_DATABASE and TEST_BASE_URL at a scratch database/API.
 * The API must write to this checkout's server/logs (the test reads the error log).
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> TEST_BASE_URL=http://localhost:<port> node server/tests/session-ua-binding.regression.cjs
 */
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const RUN = `regress_ua_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;
const PROBE_PATH = "/api/users/me/settings";
const LOGS_DIR = path.join(__dirname, "..", "logs");

const created = { userIds: [], sessionIds: [] };
let passed = 0;
let failed = 0;

const CHROME_WIN = (v) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36`;
const CHROME_ANDROID = (v) => `Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Mobile Safari/537.36`;
const FIREFOX_WIN = (v) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${v}.0) Gecko/20100101 Firefox/${v}.0`;
const EDGE_WIN = (v) => `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.0.0 Safari/537.36 Edg/${v}.0.0.0`;

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

let userCounter = 0;
// One user and one session per case, so the once-per-session log throttle never hides an event.
async function createSession(storedUserAgent) {
  const id = `${RUN}_${++userCounter}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, 'resident', true, false, false, NOW(), NOW())`,
    [id, `Regression ${id}`, `${id}@${EMAIL_DOMAIN}`]
  );
  created.userIds.push(id);
  const ctx = await auth.$context;
  const token = crypto.randomBytes(24).toString("hex");
  const sessionId = `${id}_session`;
  await pool.query(
    `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
     VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW(), NOW(), '127.0.0.1', $3, $4)`,
    [sessionId, token, storedUserAgent, id]
  );
  created.sessionIds.push(sessionId);
  const signature = crypto.createHmac("sha256", ctx.secret).update(token).digest("base64");
  return { id, sessionId, cookie: `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}` };
}

// http.request instead of fetch: fetch always sends a User-Agent, and case e) needs none.
function call(session, userAgent) {
  const url = new URL(BASE_URL + PROBE_PATH);
  const headers = { Accept: "application/json", Cookie: session.cookie };
  if (userAgent !== undefined) headers["User-Agent"] = userAgent;
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname, method: "GET", headers },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          let body = null;
          try { body = JSON.parse(data); } catch { /* not JSON */ }
          resolve({ status: res.statusCode, body });
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const sessionExists = async (session) =>
  (await pool.query(`SELECT 1 FROM session WHERE id = $1`, [session.sessionId])).rowCount === 1;

// Events the API wrote for this user (server/logs/error-<UTC date>.log, one JSON object per line).
function loggedEvents(userId) {
  const file = path.join(LOGS_DIR, `error-${new Date().toISOString().slice(0, 10)}.log`);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.includes(userId))
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter((e) => e && e.userId === userId);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`not ok - ${name}\n    ${String(err.message).split("\n").join("\n    ")}`);
  }
}

async function cleanup() {
  try {
    if (created.sessionIds.length) await pool.query(`DELETE FROM session WHERE id = ANY($1::text[])`, [created.sessionIds]);
    if (created.userIds.length) {
      await pool.query(`DELETE FROM session WHERE "userId" = ANY($1::text[])`, [created.userIds]);
      await pool.query(`DELETE FROM "user" WHERE id = ANY($1::text[])`, [created.userIds]);
    }
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE id = ANY($1::text[])`, [created.userIds]);
    const { rows: s } = await pool.query(`SELECT COUNT(*)::int AS n FROM session WHERE id = ANY($1::text[])`, [created.sessionIds]);
    console.log(`remaining fixtures: users=${rows[0].n} sessions=${s[0].n}`);
  } catch (err) {
    console.log(`cleanup error: ${err.message}`);
  }
}

async function main() {
  await assertScratchDatabase();

  // ---- unit: normalizer ----
  await test("normalizer: families, versions and OS", () => {
    const { normalizeUserAgent } = require("../utils/userAgent");
    const cases = [
      [CHROME_WIN(156), { family: "chrome", engine: "blink", os: "windows", version: "156" }],
      [CHROME_ANDROID(157), { family: "chrome", engine: "blink", os: "android", version: "157" }],
      [FIREFOX_WIN(121), { family: "firefox", engine: "gecko", os: "windows", version: "121" }],
      [EDGE_WIN(120), { family: "edge", engine: "blink", os: "windows", version: "120" }],
      ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
        { family: "safari", engine: "webkit", os: "macos", version: "17" }],
      ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1",
        { family: "chrome", engine: "webkit", os: "ios", version: "120" }],
      ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0",
        { family: "opera", engine: "blink", os: "windows", version: "106" }],
      ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/157.0.0.0 Safari/537.36",
        { family: "chrome", engine: "blink", os: "windows", version: "157" }],
      ["curl/8.4.0", { family: "curl", engine: "other", os: "other", version: "8" }],
    ];
    for (const [ua, want] of cases) assert.deepEqual(normalizeUserAgent(ua), want, ua);
    for (const empty of [undefined, null, "", "   "]) assert.equal(normalizeUserAgent(empty), null);
  });

  await test("normalizer: hostile input stays bounded and fast", () => {
    const { normalizeUserAgent } = require("../utils/userAgent");
    assert.ok(normalizeUserAgent("Chrome/" + "9".repeat(16000)).version.length <= 4, "version digits are capped");
    assert.ok(normalizeUserAgent("curl/" + "9".repeat(16000)).version.length <= 4);
    // 16 KB is Node's default header limit; a leading-wildcard Safari regex took ~17 ms here, 68 s at 1 MB
    const start = process.hrtime.bigint();
    normalizeUserAgent("Version/1 ".repeat(100000));
    assert.ok(Number(process.hrtime.bigint() - start) / 1e6 < 100, "quadratic scan");
    assert.equal(normalizeUserAgent("Mozilla/5.0 (Macintosh) Version/17.2 Safari/605.1.15").family, "safari");
    assert.equal(normalizeUserAgent("Version/17.2 without the s-word").family, "version");
    // in-app browsers and WebViews
    assert.equal(normalizeUserAgent("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0]").family, "chrome");
    assert.equal(normalizeUserAgent("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36").family, "samsung");
  });

  // ---- a ----
  await test("a) identical UA -> 200", async () => {
    const s = await createSession(CHROME_WIN(156));
    const r = await call(s, CHROME_WIN(156));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(loggedEvents(s.id).length, 0);
  });

  // ---- b ----
  for (const [label, ua] of [["Chrome 156 -> 157", CHROME_WIN], ["Firefox 120 -> 121", FIREFOX_WIN], ["Edge 120 -> 121", EDGE_WIN]]) {
    await test(`b) ${label}: 200, no revoke`, async () => {
      const [from, to] = label.match(/(\d+) -> (\d+)/).slice(1);
      const s = await createSession(ua(from));
      const r = await call(s, ua(to));
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(await sessionExists(s), true, "session must survive");
      assert.equal(loggedEvents(s.id).some((e) => e.event === "session_hijack_attempt_detected"), false);
    });
  }

  // ---- c ----
  await test("c) Chrome Windows -> Chrome Android: 200, logged with reason, no revoke", async () => {
    const s = await createSession(CHROME_WIN(157));
    const r = await call(s, CHROME_ANDROID(157));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await sessionExists(s), true);
    const ev = loggedEvents(s.id).find((e) => e.event === "session_client_change_noted");
    assert.ok(ev, "expected a session_client_change_noted event");
    assert.equal(ev.reason, "os_changed");
    assert.equal(ev.expected.os, "windows");
    assert.equal(ev.received.os, "android");
    assert.equal(ev.expected.family, "chrome");
    assert.equal(loggedEvents(s.id).some((e) => e.event === "session_hijack_attempt_detected"), false);
  });
  await test("c) Chrome Android -> Chrome Windows (Request desktop site direction): 200, no revoke", async () => {
    const s = await createSession(CHROME_ANDROID(157));
    const r = await call(s, CHROME_WIN(157));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await sessionExists(s), true);
  });
  await test("c) version-only change is logged as version_changed", async () => {
    const s = await createSession(CHROME_WIN(156));
    await call(s, CHROME_WIN(157));
    const ev = loggedEvents(s.id).find((e) => e.event === "session_client_change_noted");
    assert.ok(ev, "expected a session_client_change_noted event");
    assert.equal(ev.reason, "version_changed");
    assert.equal(ev.expected.version, "156");
    assert.equal(ev.received.version, "157");
  });

  await test("c) rotating the version on every request logs once per session", async () => {
    const s = await createSession(CHROME_WIN(156));
    for (let v = 200; v < 210; v++) assert.equal((await call(s, CHROME_WIN(v))).status, 200);
    // a different reason is still worth its own line
    assert.equal((await call(s, CHROME_ANDROID(210))).status, 200);
    const reasons = loggedEvents(s.id).filter((e) => e.event === "session_client_change_noted").map((e) => e.reason);
    assert.deepEqual(reasons.sort(), ["os_changed", "version_changed"]);
  });

  // ---- d ----
  await test("d) Chrome -> Firefox: 401 SESSION_BROWSER_CHANGED, revoked, logged", async () => {
    const s = await createSession(CHROME_WIN(157));
    const r = await call(s, FIREFOX_WIN(121));
    assert.equal(r.status, 401);
    assert.equal(r.body?.error, "SESSION_BROWSER_CHANGED");
    assert.ok(r.body?.message, "message present for humans");
    assert.equal(await sessionExists(s), false, "session must be deleted");
    const ev = loggedEvents(s.id).find((e) => e.event === "session_hijack_attempt_detected");
    assert.ok(ev, "expected session_hijack_attempt_detected");
    assert.equal(ev.reason, "browser_family_changed");
    assert.equal(ev.expected.family, "chrome");
    assert.equal(ev.received.family, "firefox");
    // the revoked token no longer authenticates
    const again = await call(s, CHROME_WIN(157));
    assert.equal(again.status, 401);
  });
  await test("d) Chrome -> Edge (Edge's UA also says Chrome): 401, different family", async () => {
    const s = await createSession(CHROME_WIN(120));
    const r = await call(s, EDGE_WIN(120));
    assert.equal(r.status, 401);
    assert.equal(await sessionExists(s), false);
  });

  // ---- e ----
  await test("e) no User-Agent header -> 200, no revoke, logged as ua_missing", async () => {
    const s = await createSession(CHROME_WIN(157));
    const r = await call(s, undefined);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await sessionExists(s), true);
    const ev = loggedEvents(s.id).find((e) => e.event === "session_client_change_noted");
    assert.ok(ev);
    assert.equal(ev.reason, "ua_missing");
  });
  await test("e) empty User-Agent header -> 200, no revoke", async () => {
    const s = await createSession(CHROME_WIN(157));
    const r = await call(s, "");
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await sessionExists(s), true);
  });
  await test("e) session stored without a UA is not bound", async () => {
    const s = await createSession(null);
    const r = await call(s, FIREFOX_WIN(121));
    assert.equal(r.status, 200, JSON.stringify(r.body));
  });

  // ---- f ----
  await test("f) legacy stored raw UA (Chrome/140 -> 141, the audit repro) still works", async () => {
    const s = await createSession(CHROME_WIN(140));
    const r = await call(s, CHROME_WIN(141));
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await sessionExists(s), true);
  });
  await test("f) legacy stored non-browser UA: same product, new version -> 200; other product -> 401", async () => {
    const s1 = await createSession("curl/8.0.1");
    assert.equal((await call(s1, "curl/8.4.0")).status, 200);
    const s2 = await createSession("curl/8.0.1");
    const r = await call(s2, "python-requests/2.31");
    assert.equal(r.status, 401);
    assert.equal(r.body?.error, "SESSION_BROWSER_CHANGED");
  });
}

main()
  .catch((err) => {
    failed++;
    console.log(`not ok - harness: ${err.stack || err.message}`);
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n${passed} passed, ${failed} failed`);
    await pool.end().catch(() => {});
    process.exit(failed ? 1 : 0);
  });
