/**
 * Regression test for audit finding P5-10: a password reset by email skipped what a password change does.
 * POST /api/auth/reset-password carries only { newPassword, token }, so the after-hook never found the
 * user: no "Account Recovered" email, no activity_log row, "lastPasswordChange" not updated (so the
 * 24 h change-password cooldown ignored resets). Better Auth's own session revocation did run.
 *
 * Runs Better Auth in-process through auth.handler with a real Request (the same pipeline as HTTP:
 * hooks and the emailAndPassword callbacks), with outgoing mail stubbed, and asserts:
 *   a) reset with a valid token -> exactly one "Account Recovered" email to that user, exactly one
 *      "Reset password" activity row, lastPasswordChange updated, no session left
 *   b) a wrong token -> 400 and none of those (sessions kept, lastPasswordChange unchanged)
 *   c) an expired token -> 400 and none of those
 *   d) a valid token sent with someone else's email in the body -> the after-steps happen for the
 *      token's owner only; the other user gets no email, no row, and keeps their sessions
 *
 * Fixtures are created from server/.env and deleted by exact id. Refuses to run unless the database
 * is on loopback, and refuses LMS_db: point DB_DATABASE at a scratch database.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> node server/tests/password-reset-aftersteps.regression.cjs
 */
const crypto = require("crypto");

// Stub outgoing mail before anything that captures the transporter is loaded.
const { transporter } = require("../utils/mailer");
const sent = [];
transporter.sendMail = async (mail) => {
  sent.push(mail);
  return { stubbed: true };
};

const pool = require("../config/db");
const { auth } = require("../utils/auth");

const RUN = `regress_pwr_${crypto.randomBytes(4).toString("hex")}`;
const UA = "password-reset-aftersteps-regression/1.0";
const BASE = process.env.BETTER_AUTH_URL || "http://localhost:5000";
const ORIGIN = "http://localhost:5173";
const OLD_CHANGE = "2026-01-01T00:00:00.000Z";
const created = { userIds: [] };
let passed = 0;
let failed = 0;

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

const password = () => `Zz-${crypto.randomBytes(6).toString("hex")}-Aa1!`;

const anyBarangay = async () => (await pool.query("SELECT name FROM barangays ORDER BY id LIMIT 1")).rows[0].name;

// A verified resident with two live sessions (two other devices) and an old lastPasswordChange.
let counter = 0;
async function createUser() {
  const label = `u${++counter}`;
  const email = `${RUN}_${label}@example.invalid`;
  const signUp = await auth.api.signUpEmail({
    body: { email, password: password(), name: `Regression ${label}`, first_name: "Regression", last_name: "Reset", barangay: await anyBarangay() },
    headers: new Headers({ "user-agent": UA }),
  });
  const id = signUp.user.id;
  created.userIds.push(id);
  await pool.query(`UPDATE "user" SET "emailVerified" = true, "lastPasswordChange" = $2 WHERE id = $1`, [id, OLD_CHANGE]);
  for (const n of [1, 2]) {
    await pool.query(
      `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
       VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW(), NOW(), '127.0.0.1', $3, $4)`,
      [`${id}_s${n}`, crypto.randomBytes(12).toString("hex"), UA, id]
    );
  }
  // Read back, so the comparison doesn't depend on how the column stores time zones
  const baseline = (await pool.query(`SELECT "lastPasswordChange" AS t FROM "user" WHERE id = $1`, [id])).rows[0].t;
  return { id, email, baseline };
}

const post = (path, body) =>
  auth.handler(
    new Request(`${BASE}/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, "user-agent": UA },
      body: JSON.stringify(body),
    })
  );

// The token from the reset email the app sends (the link the user clicks).
async function requestToken(user) {
  sent.length = 0;
  const res = await post("/request-password-reset", { email: user.email, redirectTo: `${ORIGIN}/reset-password` });
  if (res.status !== 200) throw new Error(`request-password-reset gave ${res.status}`);
  const mail = sent.find((m) => m.to === user.email);
  const token = mail && /token=([A-Za-z0-9_-]+)/.exec(mail.html)?.[1];
  if (!token) throw new Error("no reset token in the captured email");
  sent.length = 0;
  return token;
}

// The after-steps run without being awaited by the request; give them time to land.
const settle = () => new Promise((r) => setTimeout(r, 1500));

async function state(user) {
  const q = async (sql) => (await pool.query(sql, [user.id])).rows[0];
  return {
    recoveredMails: sent.filter((m) => m.to === user.email && /Account Recovered/.test(m.subject)).length,
    resetRows: Number((await q(`SELECT COUNT(*) AS n FROM activity_log WHERE user_id = $1 AND act_log = 'Reset password'`)).n),
    sessions: Number((await q(`SELECT COUNT(*) AS n FROM session WHERE "userId" = $1`)).n),
    lastPasswordChange: (await q(`SELECT "lastPasswordChange" AS t FROM "user" WHERE id = $1`)).t,
    baseline: user.baseline,
  };
}

function expectNone(s, label) {
  const problems = [];
  if (s.recoveredMails !== 0) problems.push(`${s.recoveredMails} recovered email(s)`);
  if (s.resetRows !== 0) problems.push(`${s.resetRows} 'Reset password' row(s)`);
  if (s.sessions !== 2) problems.push(`${s.sessions} session(s) left, expected 2`);
  if (new Date(s.lastPasswordChange).getTime() !== new Date(s.baseline).getTime()) problems.push(`lastPasswordChange changed to ${s.lastPasswordChange}`);
  if (problems.length) throw new Error(`${label}: ${problems.join("; ")}`);
}

function expectOnce(s, label) {
  const problems = [];
  if (s.recoveredMails !== 1) problems.push(`${s.recoveredMails} "Account Recovered" email(s), expected 1`);
  if (s.resetRows !== 1) problems.push(`${s.resetRows} 'Reset password' activity row(s), expected 1`);
  if (s.sessions !== 0) problems.push(`${s.sessions} session(s) left, expected 0`);
  if (new Date(s.lastPasswordChange).getTime() <= new Date(s.baseline).getTime()) problems.push(`lastPasswordChange not updated (${s.lastPasswordChange})`);
  if (problems.length) throw new Error(`${label}: ${problems.join("; ")}`);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`not ok - ${name}\n  ${err.message}`);
  }
}

async function main() {
  await assertScratchDatabase();

  await test("reset with a valid token runs every after-step exactly once", async () => {
    const user = await createUser();
    const token = await requestToken(user);
    const res = await post("/reset-password", { newPassword: password(), token });
    if (res.status !== 200) throw new Error(`reset-password gave ${res.status}: ${await res.text()}`);
    await settle();
    expectOnce(await state(user), "valid token");
  });

  await test("a wrong token is refused and runs no after-step", async () => {
    const user = await createUser();
    await requestToken(user);
    const res = await post("/reset-password", { newPassword: password(), token: "not-a-real-token" });
    if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
    await settle();
    expectNone(await state(user), "wrong token");
  });

  await test("an expired token is refused and runs no after-step", async () => {
    const user = await createUser();
    const token = await requestToken(user);
    await pool.query(`UPDATE verification SET "expiresAt" = NOW() - INTERVAL '1 minute' WHERE identifier = $1`, [`reset-password:${token}`]);
    const res = await post("/reset-password", { newPassword: password(), token });
    if (res.status !== 400) throw new Error(`expected 400, got ${res.status}`);
    await settle();
    expectNone(await state(user), "expired token");
  });

  await test("someone else's email in the body doesn't move the after-steps to them", async () => {
    const owner = await createUser();
    const other = await createUser();
    const token = await requestToken(owner);
    const res = await post("/reset-password", { newPassword: password(), token, email: other.email });
    if (res.status !== 200) throw new Error(`reset-password gave ${res.status}: ${await res.text()}`);
    await settle();
    const problems = [];
    for (const [label, check, who] of [["owner", expectOnce, owner], ["other user", expectNone, other]]) {
      try {
        check(await state(who), label);
      } catch (err) {
        problems.push(err.message);
      }
    }
    if (problems.length) throw new Error(problems.join(" | "));
  });
}

async function cleanup() {
  if (!created.userIds.length) return;
  await pool.query(`DELETE FROM activity_log WHERE user_id = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM verification WHERE value = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
}

main()
  .catch((err) => {
    failed++;
    console.error("FAIL:", err.message);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("CLEANUP FAILED:", err.message);
      failed++;
    }
    await pool.end();
    console.log(`${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
