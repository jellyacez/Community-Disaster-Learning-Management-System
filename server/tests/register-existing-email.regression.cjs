/**
 * Regression test: registering an email that already has an account must return a
 * clear 422 USER_ALREADY_EXISTS (before hook in utils/authHooks.js) instead of
 * Better Auth's anti-enumeration 200.
 *
 * Runs Better Auth in-process through auth.api (hooks run; Turnstile is Express
 * middleware and does not apply) and asserts:
 *   1. a brand-new email still signs up exactly as before (one new user row,
 *      response shape { token: null, user: {...} })
 *   2. the same email again -> 422 USER_ALREADY_EXISTS, user count unchanged
 *   3. the same email with different case and surrounding spaces -> the same 422
 *   4. sign-in for the existing (verified) user still works
 *   5. no foreign-key error is logged for the duplicate attempts
 *
 * Outgoing email is stubbed (transporter.sendMail), so nothing is sent.
 * Refuses to run unless the database server is on a loopback address. The test
 * user and its session/account/verification/activity rows are deleted by exact ID.
 *
 * Run from the repo root:  node server/tests/register-existing-email.regression.cjs
 */
const crypto = require("crypto");
const assert = require("assert/strict");

// Stub outgoing mail before anything that captures the transporter is loaded.
const { transporter } = require("../utils/mailer");
const sentMail = [];
transporter.sendMail = async (options) => {
  sentMail.push({ to: options?.to, subject: options?.subject });
  return { stubbed: true };
};

const pool = require("../config/db");
const { auth } = require("../utils/auth");

const RUN = `zz_test_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL = `${RUN}@example.invalid`;
const PASSWORD = `Zz-${crypto.randomBytes(6).toString("hex")}-Aa1!`;
const UA = "register-existing-email-regression/1.0";
let createdUserId = null;

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to run against a non-local database (${addr}).`);
}

async function userCount(email) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE LOWER(email) = LOWER($1)`, [email]);
  return rows[0].n;
}

async function signUp(email) {
  try {
    const res = await auth.api.signUpEmail({
      body: { email, password: PASSWORD, name: "ZZ Test Register" },
      headers: new Headers({ "user-agent": UA }),
    });
    return { ok: true, res };
  } catch (err) {
    return { ok: false, status: err.statusCode, body: err.body, name: err.name };
  }
}

// Capture anything logged while the duplicate attempts run, to prove no FK error.
function captureConsoleErrors() {
  const lines = [];
  const original = console.error;
  console.error = (...args) => {
    lines.push(args.map(String).join(" "));
    original(...args);
  };
  return { lines, restore: () => (console.error = original) };
}

async function cleanup() {
  const ids = createdUserId ? [createdUserId] : [];
  const lookup = await pool.query(`SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)`, [EMAIL]);
  for (const r of lookup.rows) if (!ids.includes(r.id)) ids.push(r.id);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [ids]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [ids]);
    await client.query(`DELETE FROM account WHERE "userId" = ANY($1)`, [ids]);
    await client.query("DELETE FROM verification WHERE identifier = $1 OR identifier = ANY($2)", [EMAIL, ids]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [ids]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM "user" WHERE id = ANY($1) OR LOWER(email) = LOWER($2)) AS users,
       (SELECT COUNT(*)::int FROM session WHERE "userId" = ANY($1)) AS sessions,
       (SELECT COUNT(*)::int FROM account WHERE "userId" = ANY($1)) AS accounts,
       (SELECT COUNT(*)::int FROM verification WHERE identifier = $2 OR identifier = ANY($1)) AS verifications,
       (SELECT COUNT(*)::int FROM activity_log WHERE user_id = ANY($1)) AS activity_log`,
    [ids, EMAIL]
  );
  console.log(`cleanup ids: ${JSON.stringify(ids)}`);
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left rows behind");
}

async function main() {
  await assertLocalDatabase();
  assert.equal(await userCount(EMAIL), 0, "test email must not exist before the run");

  // Case 1: brand-new email still signs up as before.
  const fresh = await signUp(EMAIL);
  console.log("case 1 (new email):", JSON.stringify(fresh.ok ? { ok: true, keys: Object.keys(fresh.res), token: fresh.res.token, userEmail: fresh.res.user?.email } : fresh));
  assert.equal(fresh.ok, true, "new email must sign up successfully");
  assert.equal(fresh.res.token, null, "requireEmailVerification: no session token on sign-up");
  assert.equal(fresh.res.user?.email, EMAIL);
  createdUserId = fresh.res.user.id;
  assert.equal(await userCount(EMAIL), 1, "exactly one user row after the new sign-up");

  // Cases 2 and 3: duplicates, with FK-error capture.
  const capture = captureConsoleErrors();
  const exact = await signUp(EMAIL);
  const variant = await signUp(`   ${EMAIL.toUpperCase()}  `);
  capture.restore();
  for (const [label, r] of [["case 2 (same email)", exact], ["case 3 (case + spaces)", variant]]) {
    console.log(`${label}:`, JSON.stringify(r));
    assert.equal(r.ok, false, `${label} must be rejected`);
    assert.equal(r.status, 422, `${label} status`);
    assert.equal(r.body?.code, "USER_ALREADY_EXISTS", `${label} code`);
    assert.equal(r.body?.message, "An account with this email already exists. Please sign in or reset your password.");
  }
  assert.equal(await userCount(EMAIL), 1, "user count unchanged after duplicates");

  // Case 5: nothing FK-related logged during the duplicate attempts.
  const fkLines = capture.lines.filter((l) => /foreign key|fk_user|violates/i.test(l));
  console.log(`case 5 (FK errors during duplicates): ${fkLines.length} line(s)`);
  assert.equal(fkLines.length, 0, `unexpected FK error log: ${fkLines.join(" | ")}`);

  // Case 4: sign-in for the existing user still works once verified.
  await pool.query(`UPDATE "user" SET "emailVerified" = true WHERE id = $1`, [createdUserId]);
  const signIn = await auth.api.signInEmail({
    body: { email: EMAIL, password: PASSWORD },
    headers: new Headers({ "user-agent": UA }),
  });
  console.log("case 4 (sign-in):", JSON.stringify({ hasToken: Boolean(signIn?.token), userId: signIn?.user?.id === createdUserId }));
  assert.ok(signIn?.token, "sign-in must return a session token");
  assert.equal(signIn.user.id, createdUserId);

  console.log(`stubbed emails: ${sentMail.length} (${sentMail.map((m) => m.subject).join(" | ")})`);
}

main()
  .then(() => {
    console.log("PASS: register-existing-email regression");
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error("FAIL:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("CLEANUP FAILED:", err.message);
      process.exitCode = 1;
    }
    await pool.end();
    process.exit(process.exitCode);
  });
