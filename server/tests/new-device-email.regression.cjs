/**
 * Regression test: the "new login" security email (securityService.handleNewDeviceLoginCheck).
 * 1) It compared the exact User-Agent, so every browser update looked like a new device.
 * 2) It only knew devices from LIVE sessions, and sign-out, expiry, force-logout-all and restores
 *    delete them, so signing in again from the same phone after a sign-out sent the email every time.
 * A device is now new when the user's user_known_devices has no row for its browser family and OS
 * (rows are upserted on every sign-in and outlive sessions).
 *
 * Runs in-process (no API needed) with the mailer stubbed, and asserts:
 *   a) the same UA as an earlier sign-in -> no email
 *   b) only the browser version changed (Chrome 156 -> 157; Firefox, Edge) -> no email
 *   c) same browser on another OS (Windows -> Android) -> email
 *   d) different browser family (Chrome -> Firefox) -> email
 *   e) the new session has no UA -> no email; no earlier sign-in at all -> email (unchanged behaviour)
 *   f) sessions stored as full raw UAs (older builds) are backfilled normalized
 *   g) sign out / session expiry / force-logout-all, then the same browser and OS again (also after a
 *      version bump) -> no email; a new browser or OS -> exactly one, then remembered
 *   h) concurrent first logins from one new device -> exactly one email; deleting the user deletes
 *      the remembered devices
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
async function createUser() {
  const id = `${RUN}_${++counter}`;
  const email = `${id}@${EMAIL_DOMAIN}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, 'resident', false, false, false, NOW(), NOW())`,
    [id, `Regression ${id}`, email]
  );
  created.userIds.push(id);
  return { id, email, n: 0 };
}

// The session row better-auth writes on sign-in. `age` makes it older (legacy history).
async function insertSession(user, ua, age = "0 seconds") {
  const sessionId = `${user.id}_s${++user.n}`;
  await pool.query(
    `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
     VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW() - $3::interval, NOW(), '127.0.0.1', $4, $5)`,
    [sessionId, crypto.randomBytes(12).toString("hex"), age, ua, user.id]
  );
  created.sessionIds.push(sessionId);
  return sessionId;
}

// One sign-in: the session row, then the check the after-hook runs. Returns the mails it sent.
async function signIn(user, ua) {
  await insertSession(user, ua);
  sent.length = 0;
  await securityService.handleNewDeviceLoginCheck(user.email);
  return sent.slice();
}
const signOut = (user) => pool.query(`DELETE FROM session WHERE "userId" = $1`, [user.id]);
const expireSessions = (user) => pool.query(`UPDATE session SET "expiresAt" = NOW() - INTERVAL '1 day' WHERE "userId" = $1`, [user.id]);
const knownDevices = async (user) =>
  (await pool.query(`SELECT browser_family, os_family FROM user_known_devices WHERE user_id = $1 ORDER BY browser_family, os_family`, [user.id])).rows;

// `earlier` are the UAs of sign-ins before the one being checked (their sessions stay live);
// `latest` is the new login.
async function scenario(earlier, latest) {
  const user = await createUser();
  for (const ua of earlier) await signIn(user, ua);
  return { mails: await signIn(user, latest), user };
}

// History written by older builds: raw UAs in live sessions and no user_known_devices rows yet.
async function legacyScenario(rawUas, latest) {
  const user = await createUser();
  for (const ua of rawUas) await insertSession(user, ua, "1 day");
  await securityService.backfillKnownDevices();
  return { mails: await signIn(user, latest), user };
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
    const { rows: k } = await pool.query(`SELECT COUNT(*)::int AS n FROM user_known_devices WHERE user_id = ANY($1::text[])`, [created.userIds]);
    console.log(`remaining fixtures: users=${rows[0].n} sessions=${s[0].n} known_devices=${k[0].n}`);
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

  await test("a) same UA as an earlier sign-in -> no email", async () => {
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
    assert.equal(r.mails[0].to, r.user.email);
  });

  await test("d) Chrome, then Firefox on the same OS -> email", async () => {
    const r = await scenario([CHROME_WIN(157)], FIREFOX_WIN(121));
    assert.equal(r.mails.length, 1);
  });
  await test("d) Chrome, then Edge on the same OS -> email", async () => {
    const r = await scenario([CHROME_WIN(157)], EDGE_WIN(120));
    assert.equal(r.mails.length, 1);
  });

  await test("d) a known device among several -> no email", async () => {
    const r = await scenario([FIREFOX_WIN(120), CHROME_ANDROID(157), CHROME_WIN(150)], CHROME_WIN(157));
    assert.equal(r.mails.length, 0);
  });

  await test("e) the new session has no UA -> no email", async () => {
    const r = await scenario([CHROME_WIN(157)], null);
    assert.equal(r.mails.length, 0);
  });
  await test("e) first sign-in ever (nothing to compare with) -> email, as before", async () => {
    const r = await scenario([], CHROME_WIN(157));
    assert.equal(r.mails.length, 1);
  });
  await test("e) earlier sign-ins without a UA do not make a device known", async () => {
    const r = await scenario([null], CHROME_WIN(157));
    assert.equal(r.mails.length, 1);
  });

  await test("f) backfill: raw Chrome/140 session, Chrome/141 now -> no email", async () => {
    assert.equal((await legacyScenario([CHROME_WIN(140)], CHROME_WIN(141))).mails.length, 0);
  });
  await test("f) backfill: raw Chrome Windows session, Chrome Android now -> email", async () => {
    assert.equal((await legacyScenario([CHROME_WIN(140)], CHROME_ANDROID(141))).mails.length, 1);
  });
  await test("f) backfill: non-browser history: same product new version -> no email, other product -> email", async () => {
    assert.equal((await legacyScenario(["curl/8.0.1"], "curl/8.4.0")).mails.length, 0);
    assert.equal((await legacyScenario(["curl/8.0.1"], "python-requests/2.31")).mails.length, 1);
  });
  await test("f) backfill: blank UAs are skipped and a second run changes nothing", async () => {
    const user = await createUser();
    for (const ua of [null, "  ", CHROME_WIN(140), CHROME_WIN(141)]) await insertSession(user, ua, "1 day");
    await securityService.backfillKnownDevices();
    await securityService.backfillKnownDevices();
    assert.deepEqual(await knownDevices(user), [{ browser_family: "chrome", os_family: "windows" }]);
  });

  await test("g) sign in, sign out, sign in again (same UA) -> one email in total", async () => {
    const user = await createUser();
    assert.equal((await signIn(user, CHROME_ANDROID(157))).length, 1, "first-ever login still emails");
    await signOut(user);
    assert.equal((await signIn(user, CHROME_ANDROID(157))).length, 0, "no second email");
    await signOut(user);
    assert.equal((await signIn(user, CHROME_ANDROID(157))).length, 0);
  });
  await test("g) same device after sign-out and a browser version bump -> no email", async () => {
    const user = await createUser();
    await signIn(user, CHROME_ANDROID(157));
    await signOut(user);
    assert.equal((await signIn(user, CHROME_ANDROID(158))).length, 0);
  });
  await test("g) same device after the session expired -> no email", async () => {
    const user = await createUser();
    await signIn(user, FIREFOX_WIN(120));
    await expireSessions(user);
    assert.equal((await signIn(user, FIREFOX_WIN(120))).length, 0);
  });
  await test("g) same device after force-logout-all (every session deleted) -> no email", async () => {
    const user = await createUser();
    await signIn(user, CHROME_WIN(157));
    await pool.query(`DELETE FROM session WHERE "userId" = $1`, [user.id]); // the real one deletes every user's rows
    assert.equal((await signIn(user, CHROME_WIN(157))).length, 0);
  });
  await test("g) a new browser or OS after sign-out -> exactly one email each, then remembered", async () => {
    const user = await createUser();
    await signIn(user, CHROME_WIN(157));
    await signOut(user);
    assert.equal((await signIn(user, FIREFOX_WIN(121))).length, 1, "new browser");
    await signOut(user);
    assert.equal((await signIn(user, CHROME_ANDROID(157))).length, 1, "new OS");
    await signOut(user);
    assert.equal((await signIn(user, FIREFOX_WIN(122))).length, 0, "Firefox on Windows is known now");
    assert.equal((await signIn(user, CHROME_ANDROID(157))).length, 0, "Chrome on Android is known now");
  });
  await test("g) one user's devices do not make another user's device known", async () => {
    const a = await createUser();
    const b = await createUser();
    await signIn(a, CHROME_WIN(157));
    assert.equal((await signIn(b, CHROME_WIN(157))).length, 1);
  });
  await test("g) a sign-in without a UA remembers nothing and emails nothing", async () => {
    const user = await createUser();
    assert.equal((await signIn(user, null)).length, 0);
    assert.deepEqual(await knownDevices(user), []);
    assert.equal((await signIn(user, CHROME_WIN(157))).length, 1);
  });
  await test("g) a later sign-in keeps first_seen_at and refreshes last_seen_at", async () => {
    const user = await createUser();
    await signIn(user, CHROME_WIN(157));
    await pool.query(
      `UPDATE user_known_devices SET first_seen_at = NOW() - INTERVAL '2 days', last_seen_at = NOW() - INTERVAL '2 days' WHERE user_id = $1`,
      [user.id]
    );
    await signOut(user);
    await signIn(user, CHROME_WIN(158));
    const { rows } = await pool.query(
      `SELECT first_seen_at < NOW() - INTERVAL '1 day' AS first_kept, last_seen_at > NOW() - INTERVAL '1 minute' AS last_bumped
       FROM user_known_devices WHERE user_id = $1`,
      [user.id]
    );
    assert.deepEqual(rows, [{ first_kept: true, last_bumped: true }]);
  });

  await test("h) two concurrent checks for one new device -> exactly one email", async () => {
    const user = await createUser();
    await insertSession(user, CHROME_WIN(157));
    sent.length = 0;
    await Promise.all([securityService.handleNewDeviceLoginCheck(user.email), securityService.handleNewDeviceLoginCheck(user.email)]);
    assert.equal(sent.length, 1);
    assert.equal((await knownDevices(user)).length, 1);
  });
  await test("h) deleting the user deletes the remembered devices (cascade)", async () => {
    const user = await createUser();
    await signIn(user, CHROME_WIN(157));
    await signIn(user, FIREFOX_WIN(121));
    await signOut(user);
    assert.equal((await knownDevices(user)).length, 2);
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [user.id]);
    assert.equal((await knownDevices(user)).length, 0);
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
