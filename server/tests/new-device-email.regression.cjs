/**
 * Regression test: the "new login" security email (securityService.handleNewDeviceLoginCheck)
 * compared the exact User-Agent, so every browser update looked like a new device and sent an email.
 * A device is now new when no OTHER live session of the user has the same browser family and OS.
 *
 * Runs in-process (no API needed) with the mailer stubbed, and asserts:
 *   a) the same UA as an earlier session -> no email
 *   b) only the browser version changed (Chrome 156 -> 157; Firefox, Edge) -> no email
 *   c) same browser on another OS (Windows -> Android) -> email
 *   d) different browser family (Chrome -> Firefox) -> email
 *   e) the new session has no UA -> no email; no earlier session at all -> email (unchanged behaviour)
 *   f) earlier sessions stored as full raw UAs (older builds) are compared normalized
 * plus unit checks of isNewDevice().
 *
 * Fixtures are seeded from server/.env and deleted by exact id. Refuses to run unless the database
 * is on loopback, and refuses LMS_db: point DB_DATABASE at a scratch database.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> node server/tests/new-device-email.regression.cjs
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
const securityService = require("../services/securityService");

const RUN = `regress_nd_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;
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

let counter = 0;
// `earlier` are the UAs of sessions created before the one being checked; `latest` is the new login.
async function scenario(earlier, latest) {
  const id = `${RUN}_${++counter}`;
  const email = `${id}@${EMAIL_DOMAIN}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, 'resident', false, false, false, NOW(), NOW())`,
    [id, `Regression ${id}`, email]
  );
  created.userIds.push(id);
  const insert = async (n, ua, ageMinutes) => {
    const sessionId = `${id}_s${n}`;
    await pool.query(
      `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
       VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW() - ($3 || ' minutes')::interval, NOW(), '127.0.0.1', $4, $5)`,
      [sessionId, crypto.randomBytes(12).toString("hex"), String(ageMinutes), ua, id]
    );
    created.sessionIds.push(sessionId);
  };
  for (const [i, ua] of earlier.entries()) await insert(i, ua, 100 - i);
  await insert("latest", latest, 0);
  sent.length = 0;
  await securityService.handleNewDeviceLoginCheck(email);
  return { mails: sent.slice(), email };
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

  await test("isNewDevice: unit", () => {
    const { isNewDevice } = require("../utils/userAgent");
    assert.equal(isNewDevice(CHROME_WIN(157), [CHROME_WIN(156)]), false);
    assert.equal(isNewDevice(CHROME_WIN(157), [CHROME_ANDROID(157)]), true);
    assert.equal(isNewDevice(CHROME_WIN(157), [FIREFOX_WIN(121), CHROME_ANDROID(157)]), true);
    assert.equal(isNewDevice(CHROME_WIN(157), [FIREFOX_WIN(121), CHROME_WIN(150)]), false);
    assert.equal(isNewDevice(CHROME_WIN(157), []), true);
    assert.equal(isNewDevice(CHROME_WIN(157), [null, "", "  "]), true, "blank history rows do not count as a known device");
    assert.equal(isNewDevice(null, [CHROME_WIN(157)]), false);
    assert.equal(isNewDevice("", []), false);
  });

  await test("a) same UA as an earlier session -> no email", async () => {
    const r = await scenario([CHROME_WIN(157)], CHROME_WIN(157));
    assert.equal(r.mails.length, 0);
  });

  for (const [label, ua, from, to] of [["Chrome", CHROME_WIN, 156, 157], ["Firefox", FIREFOX_WIN, 120, 121], ["Edge", EDGE_WIN, 120, 121]]) {
    await test(`b) ${label} ${from} -> ${to} (browser update) -> no email`, async () => {
      const r = await scenario([ua(from)], ua(to));
      assert.equal(r.mails.length, 0);
    });
  }

  await test("c) Chrome Windows, then Chrome Android -> email", async () => {
    const r = await scenario([CHROME_WIN(157)], CHROME_ANDROID(157));
    assert.equal(r.mails.length, 1);
    assert.equal(r.mails[0].to, r.email);
  });

  await test("d) Chrome, then Firefox on the same OS -> email", async () => {
    const r = await scenario([CHROME_WIN(157)], FIREFOX_WIN(121));
    assert.equal(r.mails.length, 1);
  });
  await test("d) Chrome, then Edge on the same OS -> email", async () => {
    const r = await scenario([CHROME_WIN(157)], EDGE_WIN(120));
    assert.equal(r.mails.length, 1);
  });

  await test("d) a known device among several sessions -> no email", async () => {
    const r = await scenario([FIREFOX_WIN(120), CHROME_ANDROID(157), CHROME_WIN(150)], CHROME_WIN(157));
    assert.equal(r.mails.length, 0);
  });

  await test("e) the new session has no UA -> no email", async () => {
    const r = await scenario([CHROME_WIN(157)], null);
    assert.equal(r.mails.length, 0);
  });
  await test("e) first session ever (nothing to compare with) -> email, as before", async () => {
    const r = await scenario([], CHROME_WIN(157));
    assert.equal(r.mails.length, 1);
  });
  await test("e) earlier sessions without a UA do not make a device known", async () => {
    const r = await scenario([null], CHROME_WIN(157));
    assert.equal(r.mails.length, 1);
  });

  await test("f) legacy raw history (Chrome/140 stored, Chrome/141 now) -> no email", async () => {
    const r = await scenario([CHROME_WIN(140)], CHROME_WIN(141));
    assert.equal(r.mails.length, 0);
  });
  await test("f) legacy non-browser history: same product new version -> no email, other product -> email", async () => {
    assert.equal((await scenario(["curl/8.0.1"], "curl/8.4.0")).mails.length, 0);
    assert.equal((await scenario(["curl/8.0.1"], "python-requests/2.31")).mails.length, 1);
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
