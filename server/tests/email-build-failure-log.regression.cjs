/**
 * Regression test: when a credentials email can't be BUILT (e.g. FRONTEND_URL isn't an absolute
 * http(s) URL, so utils/templates/escape.js frontendUrl() throws), provisioning logged
 * "SMTP gateway unavailable" and the admin reset "SMTP offline during forced reset", though no
 * send was attempted. The log must give the real reason; the response to the admin stays as it was.
 *
 * Runs the two controllers in-process with mail stubbed and console output captured, and asserts:
 *   a) provisioning with FRONTEND_URL=javascript:... -> 201 "... Email gateway offline." (unchanged),
 *      no send attempted, no "SMTP" in the log, the frontendUrl error in the log
 *   b) admin password reset, same setup -> 200 "Password reset successfully. Email gateway offline."
 *      (unchanged), same log checks
 *   c) a real send failure (valid FRONTEND_URL, sendMail rejects) still logs the SMTP lines it did
 *
 * Fixtures are seeded from server/.env and deleted by exact id. Refuses to run unless the database
 * is on loopback, and refuses LMS_db.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> node server/tests/email-build-failure-log.regression.cjs
 */
const crypto = require("crypto");

// Stub outgoing mail before anything that captures the transporter is loaded.
const { transporter } = require("../utils/mailer");
let sendAttempts = 0;
let sendFails = false;
transporter.sendMail = async () => {
  sendAttempts++;
  if (sendFails) throw new Error("connect ECONNREFUSED 127.0.0.1:465");
  return { stubbed: true };
};

const pool = require("../config/db");
const { provisionAdmin } = require("../controllers/admin/user-management/provisionAdmin");
const { resetUserPassword } = require("../controllers/admin/user-management/resetUserPassword");

const RUN = `regress_ebf_${crypto.randomBytes(4).toString("hex")}`;
const BAD_URL = "javascript:alert(1)//";
const BUILD_ERROR = /FRONTEND_URL must be an absolute http\(s\) URL/;
const created = { userIds: [] };
let passed = 0;
let failed = 0;

// Everything the code under test prints while a case runs
let logLines = [];
for (const level of ["log", "info", "warn", "error"]) {
  const original = console[level].bind(console);
  console[level] = (...args) => {
    logLines.push(args.map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : JSON.stringify(a))).join(" "));
    if (level === "log") original(...args);
  };
}
const say = (line) => process.stdout.write(`${line}\n`);

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  say(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

async function createUser(label, role) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@example.invalid`, role]
  );
  created.userIds.push(id);
  await pool.query(
    `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $2, 'x', NOW(), NOW())`,
    [`${id}_acct`, id]
  );
  return { id, role };
}

function callHandler(handler, { body = {}, params = {}, user }) {
  return new Promise((resolve, reject) => {
    const req = { body, params, query: {}, headers: {}, user, ip: "127.0.0.1", is: (type) => type === "application/json" && type };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

async function test(name, fn) {
  logLines = [];
  sendAttempts = 0;
  try {
    await fn();
    passed++;
    say(`ok - ${name}`);
  } catch (err) {
    failed++;
    say(`not ok - ${name}\n  ${err.message}`);
  }
}

function expectBuildFailureLogged() {
  const problems = [];
  if (sendAttempts !== 0) problems.push(`${sendAttempts} send attempt(s)`);
  const smtp = logLines.filter((l) => /SMTP/i.test(l));
  if (smtp.length) problems.push(`log blames SMTP: ${JSON.stringify(smtp)}`);
  if (!logLines.some((l) => BUILD_ERROR.test(l))) problems.push(`log lacks the real reason; got ${JSON.stringify(logLines)}`);
  if (problems.length) throw new Error(problems.join("; "));
}

async function main() {
  await assertScratchDatabase();
  const actor = await createUser("actor", "super_admin");
  const savedUrl = process.env.FRONTEND_URL;

  try {
    process.env.FRONTEND_URL = BAD_URL;

    await test("provisioning: an email that can't be built logs the real reason, response unchanged", async () => {
      const email = `${RUN}_prov@example.invalid`;
      const r = await callHandler(provisionAdmin, { body: { name: "Regression Provisioned", email, role: "mdrrmo_admin" }, user: actor });
      const { rows } = await pool.query(`SELECT id FROM "user" WHERE email = $1`, [email]);
      if (rows[0]) created.userIds.push(rows[0].id);
      if (r.status !== 201 || r.body?.message !== "Admin account provisioned successfully. Email gateway offline.") {
        throw new Error(`response changed: ${r.status} ${JSON.stringify(r.body)}`);
      }
      expectBuildFailureLogged();
    });

    await test("admin reset: an email that can't be built logs the real reason, response unchanged", async () => {
      const target = await createUser("target", "resident");
      const r = await callHandler(resetUserPassword, { params: { id: target.id }, user: actor });
      if (r.status !== 200 || r.body?.message !== "Password reset successfully. Email gateway offline.") {
        throw new Error(`response changed: ${r.status} ${JSON.stringify(r.body)}`);
      }
      expectBuildFailureLogged();
    });

    process.env.FRONTEND_URL = "http://localhost:5173";
    sendFails = true;

    await test("provisioning: a real send failure still logs the SMTP line", async () => {
      const email = `${RUN}_prov2@example.invalid`;
      const r = await callHandler(provisionAdmin, { body: { name: "Regression Provisioned Two", email, role: "mdrrmo_admin" }, user: actor });
      const { rows } = await pool.query(`SELECT id FROM "user" WHERE email = $1`, [email]);
      if (rows[0]) created.userIds.push(rows[0].id);
      if (r.status !== 201) throw new Error(`${r.status} ${JSON.stringify(r.body)}`);
      if (sendAttempts !== 1) throw new Error(`${sendAttempts} send attempts`);
      if (!logLines.some((l) => /SMTP gateway unavailable/.test(l) && /ECONNREFUSED/.test(l))) throw new Error(JSON.stringify(logLines));
    });

    await test("admin reset: a real send failure still logs the SMTP line", async () => {
      const target = await createUser("target2", "resident");
      const r = await callHandler(resetUserPassword, { params: { id: target.id }, user: actor });
      if (r.status !== 200) throw new Error(`${r.status} ${JSON.stringify(r.body)}`);
      if (sendAttempts !== 1) throw new Error(`${sendAttempts} send attempts`);
      if (!logLines.some((l) => /SMTP offline during forced reset/.test(l) && /ECONNREFUSED/.test(l))) throw new Error(JSON.stringify(logLines));
    });
  } finally {
    sendFails = false;
    if (savedUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = savedUrl;
  }
}

async function cleanup() {
  if (!created.userIds.length) return;
  await pool.query(`DELETE FROM activity_log WHERE user_id = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM account WHERE "userId" = ANY($1)`, [created.userIds]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
}

main()
  .catch((err) => {
    failed++;
    say(`FAIL: ${err.stack}`);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      say(`CLEANUP FAILED: ${err.message}`);
      failed++;
    }
    await pool.end();
    say(`${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
