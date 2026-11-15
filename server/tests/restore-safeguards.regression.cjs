/**
 * Regression test: server-side safeguards on POST /api/admin/infrastructure/restore.
 *
 *   1. restore disabled -> 503 before the upload is parsed (a malformed multipart body
 *      still gets 503, not multer's 400)
 *   2. maintenance mode off -> 409
 *   3. wrong account password -> 403; the 6th failed attempt in the window -> 429
 *   4. a failing safety dump aborts the restore (500, data untouched, failure logged)
 *   5. a successful restore: encrypted safety dump written (mode 600 off Windows), data
 *      reverted, every session deleted, maintenance_mode back to 'true', completion
 *      entry in activity_log naming the backup size and the safety-dump path
 *
 * Everything runs against a scratch database created by this script from
 * migrations/schema.sql plus the numbered migrations, and dropped at the end. The main
 * database is never touched: DB_DATABASE is overridden before any app module loads.
 * Refuses to run unless DB_HOST resolves to a loopback address. Outgoing email is stubbed.
 *
 * Run from the repo root:  node server/tests/restore-safeguards.regression.cjs
 */
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert/strict");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const SCRATCH_DB = `lms_restore_scratch_${crypto.randomBytes(4).toString("hex")}`;
const SAFETY_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "lms-restore-test-"));
const SAFETY_PATH = path.join(SAFETY_DIR, "pre-restore-safety.dump");
const UA = "restore-safeguards-regression/1.0";
const PASSWORD = `Zz-${crypto.randomBytes(6).toString("hex")}-Aa1!`;
const ZIP_PASSWORD = `zip-${crypto.randomBytes(8).toString("hex")}`;
const CONFIRM = "RESTORE DATABASE";

if (!/^(localhost|127\.\d+\.\d+\.\d+|::1)$/i.test(process.env.DB_HOST || "")) {
  throw new Error(`Refusing to run: DB_HOST (${process.env.DB_HOST}) is not a loopback address.`);
}

// Must be set before config/db, utils/auth or any controller is required.
Object.assign(process.env, {
  DB_DATABASE: SCRATCH_DB,
  ENABLE_DATABASE_RESTORE: "true",
  BACKUP_ZIP_PASSWORD: ZIP_PASSWORD,
  BACKUP_ENCRYPTION_KEY: crypto.randomBytes(32).toString("hex"),
  RESTORE_SAFETY_DUMP_PATH: SAFETY_PATH,
  MFA_ENABLED: "false",
});

function makePool(database) {
  return new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: false,
  });
}

// Mirrors config/setup.js, but only ever against SCRATCH_DB.
async function createScratchDatabase() {
  const bootstrap = makePool("postgres");
  await bootstrap.query(`CREATE DATABASE "${SCRATCH_DB}"`);
  await bootstrap.end();

  const scratch = makePool(SCRATCH_DB);
  const { rows } = await scratch.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  console.log(`scratch database: ${rows[0].db} @ ${rows[0].addr ?? "unix socket"}`);
  if (rows[0].db !== SCRATCH_DB) throw new Error("Connected to the wrong database.");
  if (rows[0].addr !== null && !/^(127\.|::1)/.test(rows[0].addr)) {
    throw new Error(`Refusing to run against a non-local database (${rows[0].addr}).`);
  }

  const migrations = path.join(__dirname, "..", "migrations");
  await scratch.query("DROP SCHEMA IF EXISTS public CASCADE");
  await scratch.query("DROP SCHEMA IF EXISTS rate_limit CASCADE");
  await scratch.query("CREATE SCHEMA public");
  await scratch.query("CREATE SCHEMA rate_limit");
  let schema = fs.readFileSync(path.join(migrations, "schema.sql"), "utf8");
  schema = schema
    .replace(/^\\[a-z].*$/gim, "")
    .replace(/^(CREATE|ALTER)\s+SCHEMA\b.*$/gim, "")
    .replace(/^ALTER\s+.+\s+OWNER\s+TO\s+\S+;\s*$/gim, "");
  await scratch.query(schema);
  await scratch.query("DROP SCHEMA IF EXISTS rate_limit CASCADE");
  await scratch.query("CREATE SCHEMA rate_limit");
  for (const file of fs.readdirSync(migrations).filter((f) => /^\d+.*\.sql$/i.test(f)).sort()) {
    await scratch.query(fs.readFileSync(path.join(migrations, file), "utf8"));
  }
  await scratch.end();
}

// DROP ... WITH (FORCE) kills connections still held by library pools; ignore only those.
let droppingScratch = false;
process.on("uncaughtException", (err) => {
  if (droppingScratch) return;
  console.error(err);
  process.exit(1);
});

async function dropScratchDatabase() {
  droppingScratch = true;
  const bootstrap = makePool("postgres");
  await bootstrap.query(`DROP DATABASE IF EXISTS "${SCRATCH_DB}" WITH (FORCE)`);
  const { rows } = await bootstrap.query("SELECT COUNT(*)::int AS n FROM pg_database WHERE datname = $1", [SCRATCH_DB]);
  await bootstrap.end();
  console.log(`dropped ${SCRATCH_DB}: ${rows[0].n === 0}`);
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push({ name, ok: false });
    console.log(`FAIL  ${name}\n      ${err.message.split("\n")[0]}`);
  }
}

async function main() {
  await createScratchDatabase();

  const { transporter } = require("../utils/mailer");
  transporter.sendMail = async () => ({ stubbed: true });

  const express = require("express");
  const pool = require("../config/db");
  const { auth } = require("../utils/auth");
  const { clearMaintenanceCache } = require("../middleware/maintenanceMiddleware");

  // schema.sql lags the Better Auth config (user.first_name etc.); add what it expects.
  const { getMigrations } = await import("better-auth/db/migration");
  await (await getMigrations(auth.options)).runMigrations();
  // utils/logger.js writes ip_address, which schema.sql also lacks.
  await pool.query("ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS ip_address varchar(45)");

  const app = express();
  app.use(express.json());
  app.use("/api/admin", require("../routes/admin/adminRoutes"));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}/api/admin`;

  async function createAdmin(label) {
    const email = `zz_restore_${label}_${crypto.randomBytes(3).toString("hex")}@example.invalid`;
    const signUp = await auth.api.signUpEmail({
      body: { email, password: PASSWORD, name: `ZZ ${label}`, first_name: "ZZ", last_name: label, barangay: "Balas" },
      headers: new Headers({ "user-agent": UA }),
    });
    await pool.query(`UPDATE "user" SET "emailVerified" = true, role = 'system_admin' WHERE id = $1`, [signUp.user.id]);
    const signIn = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: new Headers({ "user-agent": UA }),
      returnHeaders: true,
    });
    const cookie = signIn.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    return { id: signUp.user.id, cookie };
  }

  const headersFor = (admin) => ({ cookie: admin.cookie, "user-agent": UA, accept: "application/json" });

  async function setMaintenance(on) {
    await pool.query(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('maintenance_mode', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [String(on)],
    );
    clearMaintenanceCache();
  }

  function restoreForm(zip, { accountPassword = PASSWORD, confirmation = CONFIRM } = {}) {
    const form = new FormData();
    form.append("accountPassword", accountPassword);
    form.append("password", ZIP_PASSWORD);
    form.append("confirmation", confirmation);
    form.append("backup", new Blob([zip], { type: "application/zip" }), "backup.zip");
    return form;
  }

  const restore = (admin, body, extraHeaders = {}) =>
    fetch(`${base}/infrastructure/restore`, { method: "POST", headers: { ...headersFor(admin), ...extraHeaders }, body });

  const admin = await createAdmin("main");
  const limitedAdmin = await createAdmin("limited");

  await setMaintenance(false);
  const backupRes = await fetch(`${base}/infrastructure/backup`, {
    method: "POST",
    headers: { ...headersFor(admin), "content-type": "application/json" },
    body: JSON.stringify({ accountPassword: PASSWORD }),
  });
  assert.equal(backupRes.status, 200, `backup setup failed with ${backupRes.status}`);
  const zip = Buffer.from(await backupRes.arrayBuffer());
  console.log(`backup ZIP: ${zip.length} bytes`);

  // Written after the backup, so a real restore must remove it.
  const marker = `zz-marker-${crypto.randomBytes(4).toString("hex")}`;
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, 'after-backup', NOW())`,
    [marker],
  );
  const markerExists = async () =>
    (await pool.query("SELECT 1 FROM system_settings WHERE key = $1", [marker])).rowCount === 1;

  await check("1. restore disabled -> 503 before the upload is parsed", async () => {
    process.env.ENABLE_DATABASE_RESTORE = "false";
    try {
      const res = await restore(admin, "--not-a-real-multipart-body--", {
        "content-type": "multipart/form-data; boundary=zz",
      });
      assert.equal(res.status, 503);
    } finally {
      process.env.ENABLE_DATABASE_RESTORE = "true";
    }
  });

  await check("2. maintenance off -> 409", async () => {
    // Wrong confirmation keeps today's code from restoring if the gate is missing.
    const res = await restore(admin, restoreForm(zip, { confirmation: "nope" }));
    assert.equal(res.status, 409);
  });

  await check("2b. restore-status reports the flag, maintenance and last backup", async () => {
    const res = await fetch(`${base}/infrastructure/restore-status`, { headers: headersFor(admin) });
    assert.equal(res.status, 200);
    const { data } = await res.json();
    assert.equal(data.restoreEnabled, true);
    assert.equal(data.maintenanceMode, false);
    assert.ok(data.lastBackupAt && !Number.isNaN(Date.parse(data.lastBackupAt)), "lastBackupAt missing");
  });

  await setMaintenance(true);

  await check("3a. wrong account password -> 403", async () => {
    const res = await restore(limitedAdmin, restoreForm(zip, { accountPassword: "wrong-password", confirmation: "nope" }));
    assert.equal(res.status, 403);
  });

  await check("3b. 6th failed attempt in the window -> 429", async () => {
    const statuses = [];
    for (let i = 0; i < 5; i += 1) {
      const res = await restore(limitedAdmin, restoreForm(zip, { accountPassword: "wrong-password", confirmation: "nope" }));
      statuses.push(res.status);
    }
    console.log(`      attempts 2-6: ${statuses.join(", ")}`);
    assert.equal(statuses[statuses.length - 1], 429);
  });

  await check("4. failed safety dump aborts the restore and logs a failure", async () => {
    const realDump = process.env.PG_DUMP_PATH;
    process.env.PG_DUMP_PATH = path.join(SAFETY_DIR, "no-such-pg_dump");
    try {
      const res = await restore(admin, restoreForm(zip));
      assert.equal(res.status, 500);
    } finally {
      process.env.PG_DUMP_PATH = realDump;
    }
    assert.equal(await markerExists(), true, "data changed even though the safety dump failed");
    const { rowCount } = await pool.query(
      "SELECT 1 FROM activity_log WHERE user_id = $1 AND act_log LIKE 'Database restore failed%'",
      [admin.id],
    );
    assert.equal(rowCount, 1, "no failure entry in activity_log");
  });

  const successRes = await restore(admin, restoreForm(zip));
  const successBody = await successRes.json().catch(() => ({}));
  console.log(`successful restore: ${successRes.status} ${JSON.stringify(successBody)}`);

  await check("5a. restore succeeds and reverts data", async () => {
    assert.equal(successRes.status, 200);
    assert.equal(await markerExists(), false, "marker written after the backup still exists");
  });

  await check("5b. safety dump written to the fixed path, encrypted", async () => {
    assert.equal(successRes.status, 200, "restore did not succeed");
    const file = fs.readFileSync(SAFETY_PATH);
    assert.notEqual(file.subarray(0, 5).toString(), "PGDMP", "safety dump is a plaintext pg_dump");
    assert.equal(file.subarray(0, 2).toString(), "PK", "safety dump is not a ZIP");
    // Same format as a downloaded backup: opens with the backup password and server key.
    const dump = await require("../services/secureBackup").unpack(file, ZIP_PASSWORD);
    assert.equal(dump.subarray(0, 5).toString(), "PGDMP");
    if (process.platform !== "win32") {
      assert.equal(fs.statSync(SAFETY_PATH).mode & 0o777, 0o600);
    }
  });

  await check("5c. every session deleted", async () => {
    assert.equal(successRes.status, 200, "restore did not succeed");
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "session"`);
    assert.equal(rows[0].n, 0);
  });

  await check("5d. maintenance_mode back to true", async () => {
    assert.equal(successRes.status, 200, "restore did not succeed");
    const { rows } = await pool.query(`SELECT value FROM system_settings WHERE key = 'maintenance_mode'`);
    assert.equal(rows[0]?.value, "true");
  });

  await check("5e. completion entry in activity_log", async () => {
    assert.equal(successRes.status, 200, "restore did not succeed");
    const { rows } = await pool.query(
      "SELECT act_log FROM activity_log WHERE user_id = $1 AND act_log LIKE 'Completed database restore%'",
      [admin.id],
    );
    assert.equal(rows.length, 1, "no completion entry");
    assert.ok(rows[0].act_log.includes(SAFETY_PATH), "entry does not name the safety-dump path");
    assert.match(rows[0].act_log, /\d+ bytes/, "entry does not state the backup size");
  });

  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}

main()
  .catch((err) => {
    console.error("setup error:", err.message);
    results.push({ name: "setup", ok: false });
  })
  .finally(async () => {
    try {
      await dropScratchDatabase();
    } catch (err) {
      console.error(`could not drop ${SCRATCH_DB}: ${err.message}`);
      process.exitCode = 1;
    }
    fs.rmSync(SAFETY_DIR, { recursive: true, force: true });
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    if (failed) process.exitCode = 1;
    // Better Auth and the rate limiter keep handles open.
    setTimeout(() => process.exit(process.exitCode ?? 0), 200);
  });
