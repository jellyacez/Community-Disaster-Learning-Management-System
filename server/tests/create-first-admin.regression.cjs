/**
 * Regression test: server/scripts/create-first-admin.js
 *
 *   1. creates a verified system_admin who can sign in, and logs it as created via CLI
 *   2. refuses when a system_admin already exists (no new user)
 *   3. promotes an existing account (role + verified email), logged as promoted via CLI
 *   4. refuses under NODE_ENV=production unless --i-understand is passed
 *   5. refuses a password passed on the command line
 *   6. never prints the password (stdout or stderr) in any run
 *
 * Builds a scratch database with config/setup.js (db:setup), runs the script as a child
 * process against it, and drops the database at the end. Refuses to run unless DB_HOST is
 * a loopback address. Outgoing email is stubbed.
 *
 * Run from the repo root:  node server/tests/create-first-admin.regression.cjs
 */
const crypto = require("crypto");
const path = require("path");
const assert = require("assert/strict");
const { spawnSync } = require("child_process");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

if (!/^(localhost|127\.\d+\.\d+\.\d+|::1)$/i.test(process.env.DB_HOST || "")) {
  throw new Error(`Refusing to run: DB_HOST (${process.env.DB_HOST}) is not a loopback address.`);
}

const SERVER = path.join(__dirname, "..");
const SCRIPT = path.join(SERVER, "scripts", "create-first-admin.js");
const SCRATCH_DB = `lms_fresh_firstadmin_${crypto.randomBytes(4).toString("hex")}`;
const PASSWORD = `Zz-${crypto.randomBytes(8).toString("hex")}-Aa1!`;
const UA = "create-first-admin-regression/1.0";
process.env.DB_DATABASE = SCRATCH_DB;
process.env.MFA_ENABLED = "false";

const outputs = [];
function runScript(args, extraEnv = {}) {
  const res = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: SERVER,
    env: { ...process.env, NODE_ENV: "development", FIRST_ADMIN_PASSWORD: PASSWORD, ...extraEnv },
    encoding: "utf8",
    timeout: 60000,
  });
  const out = `${res.stdout}\n${res.stderr}`;
  outputs.push(out);
  console.log(`      $ create-first-admin ${args.join(" ")} -> exit ${res.status}\n      ${out.trim().split("\n").filter(Boolean).slice(-2).join("\n      ")}`);
  return { status: res.status, out };
}

const makePool = (database) =>
  new Pool({ user: process.env.DB_USER, host: process.env.DB_HOST, database, password: process.env.DB_PASSWORD, port: process.env.DB_PORT, ssl: false });

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push(false);
    console.log(`FAIL  ${name}\n      ${err.message.split("\n")[0]}`);
  }
}

async function main() {
  const setup = spawnSync(process.execPath, [path.join(SERVER, "config", "setup.js")], {
    cwd: SERVER, env: process.env, encoding: "utf8", timeout: 120000,
  });
  assert.equal(setup.status, 0, `db:setup failed: ${setup.stderr || setup.stdout}`);
  console.log(`scratch database: ${SCRATCH_DB}`);

  const { transporter } = require("../utils/mailer");
  transporter.sendMail = async () => ({ stubbed: true });
  const pool = require("../config/db");
  const { auth } = require("../utils/auth");
  const userByEmail = async (email) =>
    (await pool.query(`SELECT id, role, "emailVerified" FROM "user" WHERE email = $1`, [email])).rows[0];
  const demoteAll = () => pool.query(`UPDATE "user" SET role = 'resident' WHERE role = 'system_admin'`);
  const logCount = async (id, pattern) =>
    (await pool.query(`SELECT 1 FROM activity_log WHERE user_id = $1 AND act_log ILIKE $2`, [id, pattern])).rowCount;

  const firstEmail = `zz_first_${crypto.randomBytes(3).toString("hex")}@example.invalid`;

  await check("1. creates a verified system_admin who can sign in", async () => {
    const { status } = runScript(["--email", firstEmail, "--name", "ZZ First Admin"]);
    assert.equal(status, 0);
    const user = await userByEmail(firstEmail);
    assert.ok(user, "no user created");
    assert.equal(user.role, "system_admin");
    assert.equal(user.emailVerified, true);
    const signIn = await auth.api.signInEmail({
      body: { email: firstEmail, password: PASSWORD },
      headers: new Headers({ "user-agent": UA }),
    });
    assert.ok(signIn?.user?.id, "sign-in failed");
    assert.equal(await logCount(user.id, "%created via CLI%"), 1, "no 'created via CLI' activity entry");
  });

  await check("2. refuses when a system_admin already exists", async () => {
    const other = `zz_other_${crypto.randomBytes(3).toString("hex")}@example.invalid`;
    const { status, out } = runScript(["--email", other, "--name", "ZZ Other Admin"]);
    assert.notEqual(status, 0);
    assert.match(out, /already exists/i);
    assert.equal(await userByEmail(other), undefined, "a second account was created");
  });

  await check("3. promotes an existing account", async () => {
    await demoteAll();
    const residentEmail = `zz_resident_${crypto.randomBytes(3).toString("hex")}@example.invalid`;
    await auth.api.signUpEmail({
      body: { email: residentEmail, password: PASSWORD, name: "ZZ Resident", first_name: "ZZ", last_name: "Resident", barangay: "Balas" },
      headers: new Headers({ "user-agent": UA }),
    });
    const before = await userByEmail(residentEmail);
    assert.equal(before.emailVerified, false, "fixture should start unverified");
    const { status } = runScript(["--email", residentEmail]);
    assert.equal(status, 0);
    const after = await userByEmail(residentEmail);
    assert.equal(after.role, "system_admin");
    assert.equal(after.emailVerified, true);
    assert.equal(await logCount(after.id, "%promoted via CLI%"), 1, "no 'promoted via CLI' activity entry");
  });

  await check("4a. refuses under NODE_ENV=production without --i-understand", async () => {
    await demoteAll();
    const prodEmail = `zz_prod_${crypto.randomBytes(3).toString("hex")}@example.invalid`;
    const { status, out } = runScript(["--email", prodEmail, "--name", "ZZ Prod Admin"], { NODE_ENV: "production" });
    assert.notEqual(status, 0);
    assert.match(out, /--i-understand/);
    assert.equal(await userByEmail(prodEmail), undefined);
  });

  await check("4b. --i-understand gets past the production check", async () => {
    // config/db.js requires TLS in production and the local server has none, so the run
    // stops at the connection; it must not stop at the production refusal.
    const { out } = runScript(["--email", "zz_unused@example.invalid", "--name", "ZZ X", "--i-understand"], { NODE_ENV: "production" });
    assert.doesNotMatch(out, /Refusing to run with NODE_ENV=production/);
  });

  await check("5. refuses a password on the command line", async () => {
    const { status, out } = runScript(["--email", "zz_argv@example.invalid", "--name", "ZZ Argv", "--password", "anything-at-all"]);
    assert.notEqual(status, 0);
    assert.match(out, /command line/i);
  });

  await check("6. the password never appears in any output", async () => {
    assert.ok(outputs.length >= 5);
    for (const out of outputs) assert.ok(!out.includes(PASSWORD), "password printed");
  });

  await pool.end();
}

process.on("uncaughtException", (err) => {
  if (dropping) return;
  console.error(err);
  process.exit(1);
});
let dropping = false;

main()
  .catch((err) => {
    console.error("setup error:", err.message);
    results.push(false);
  })
  .finally(async () => {
    dropping = true;
    try {
      const boot = makePool("postgres");
      await boot.query(`DROP DATABASE IF EXISTS "${SCRATCH_DB}" WITH (FORCE)`);
      const { rowCount } = await boot.query("SELECT 1 FROM pg_database WHERE datname = $1", [SCRATCH_DB]);
      await boot.end();
      console.log(`dropped ${SCRATCH_DB}: ${rowCount === 0}`);
    } catch (err) {
      console.error(`could not drop ${SCRATCH_DB}: ${err.message}`);
      process.exitCode = 1;
    }
    const failed = results.filter((ok) => !ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    setTimeout(() => process.exit(failed ? 1 : process.exitCode ?? 0), 200);
  });
