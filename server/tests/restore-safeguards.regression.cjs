/**
 * Regression test: server-side safeguards on POST /api/admin/infrastructure/restore.
 *
 *   1. restore disabled -> 503 before the upload is parsed (a malformed multipart body
 *      still gets 503, not multer's 400)
 *   2. maintenance mode off -> 409
 *   3. wrong account password -> 403; the 6th failed attempt in the window -> 429;
 *      a super_admin impersonating a system_admin -> 403
 *   4. a failing safety dump aborts the restore (500, data untouched, failure logged)
 *   5. a successful restore: encrypted safety dump written (mode 600 off Windows), data
 *      reverted, every session deleted, maintenance_mode back to 'true', completion
 *      entry in activity_log naming the backup size and the safety-dump path
 *   6. if the post-restore cleanup fails, maintenance stays on, a failure entry is
 *      logged, and the response says the restore was applied but cleanup failed
 *   7. a backup taken before emergency_contacts and user_known_devices existed restores
 *      onto the current schema: migration.sql recreates them, the backup's data comes back,
 *      sessions are cleared, maintenance is on, and the safety dump holds the newer tables
 *   8. a dump pg_restore cannot list fails before anything changes; a truncated dump and a
 *      backup migration.sql cannot upgrade both fail after the schema reset and are put
 *      back from the safety dump
 *
 * Everything runs against a scratch database created by this script the way db:setup
 * does (schema.sql, migration.sql, seed.sql), and dropped at the end. The main
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

const SCRATCH_DB = `lms_c_restore_${crypto.randomBytes(4).toString("hex")}`;
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
  for (const file of ["migration.sql", "seed.sql"]) {
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

  async function createAdmin(label, role = "system_admin") {
    const email = `zz_restore_${label}_${crypto.randomBytes(3).toString("hex")}@example.invalid`;
    const signUp = await auth.api.signUpEmail({
      body: { email, password: PASSWORD, name: `ZZ ${label}`, first_name: "ZZ", last_name: label, barangay: "Balas" },
      headers: new Headers({ "user-agent": UA }),
    });
    await pool.query(`UPDATE "user" SET "emailVerified" = true, role = $2 WHERE id = $1`, [signUp.user.id, role]);
    const signIn = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: new Headers({ "user-agent": UA }),
      returnHeaders: true,
    });
    const cookie = signIn.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    return { id: signUp.user.id, email, cookie };
  }

  async function signInAgain(user) {
    const signIn = await auth.api.signInEmail({
      body: { email: user.email, password: PASSWORD },
      headers: new Headers({ "user-agent": UA }),
      returnHeaders: true,
    });
    user.cookie = signIn.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  }

  async function downloadBackup(user) {
    const res = await fetch(`${base}/infrastructure/backup`, {
      method: "POST",
      headers: { ...headersFor(user), "content-type": "application/json" },
      body: JSON.stringify({ accountPassword: PASSWORD }),
    });
    assert.equal(res.status, 200, `backup failed with ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
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
  const impersonatedAdmin = await createAdmin("target");
  const superAdmin = await createAdmin("super", "super_admin");
  // Own failure budget: checks 7 and 8 fail on purpose and would trip admin's limiter.
  const olderAdmin = await createAdmin("older");

  await setMaintenance(false);
  const zip = await downloadBackup(admin);
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

  await check("3c. restore while impersonating -> 403, nothing restored", async () => {
    // authenticate() swaps req.user to the target when a super_admin carries these cookies.
    const impersonating = {
      cookie: `${superAdmin.cookie}; impersonated_target_id=${impersonatedAdmin.id}; impersonator_id=${superAdmin.id}`,
    };
    const res = await restore(impersonating, restoreForm(zip));
    const body = await res.json().catch(() => ({}));
    console.log(`      impersonated restore: ${res.status} ${JSON.stringify(body)}`);
    assert.equal(res.status, 403);
    assert.equal(body.error, "Exit impersonation before restoring a backup.");
    assert.equal(await markerExists(), true, "data changed during an impersonated restore");
  });

  await check("3d. backup while impersonating keeps the backup wording", async () => {
    const res = await fetch(`${base}/infrastructure/backup`, {
      method: "POST",
      headers: {
        ...headersFor(superAdmin),
        cookie: `${superAdmin.cookie}; impersonated_target_id=${impersonatedAdmin.id}; impersonator_id=${superAdmin.id}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ accountPassword: PASSWORD }),
    });
    assert.equal(res.status, 403);
    assert.equal((await res.json()).error, "Exit impersonation before creating a backup.");
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

  await check("6. cleanup failure after restore keeps maintenance on and says so", async () => {
    await signInAgain(admin);
    // A trigger that rejects DELETE on session travels inside the next backup, so the
    // restored database refuses the post-restore session wipe.
    await pool.query(`
      CREATE FUNCTION zz_block_session_delete() RETURNS trigger LANGUAGE plpgsql
        AS $$ BEGIN RAISE EXCEPTION 'zz test: session delete blocked'; END $$;
      CREATE TRIGGER zz_block_session_delete BEFORE DELETE ON public."session"
        FOR EACH STATEMENT EXECUTE FUNCTION zz_block_session_delete();`);
    await setMaintenance(false); // captured in the backup, so the restore turns it off
    const blockedZip = await downloadBackup(admin);
    await setMaintenance(true);

    const res = await restore(admin, restoreForm(blockedZip));
    const body = await res.json().catch(() => ({}));
    console.log(`      cleanup-failure restore: ${res.status} ${JSON.stringify(body)}`);
    assert.equal(res.status, 500);
    assert.equal(body.restoreApplied, true, "response does not say the restore was applied");
    assert.equal(
      body.error,
      "Restore applied, but cleanup failed: sessions may still be active, sign out all users from Security.",
    );
    const { rows } = await pool.query(`SELECT
      (SELECT value FROM system_settings WHERE key = 'maintenance_mode') AS maintenance,
      (SELECT COUNT(*)::int FROM "session") AS sessions`);
    assert.equal(rows[0].maintenance, "true", "maintenance mode was left off");
    assert.ok(rows[0].sessions > 0, "sessions were deleted, so the cleanup did not fail");
    const { rowCount } = await pool.query(
      "SELECT 1 FROM activity_log WHERE user_id = $1 AND act_log LIKE 'Database restore applied, but post-restore cleanup failed%'",
      [admin.id],
    );
    assert.equal(rowCount, 1, "no cleanup-failure entry in activity_log");
  });

  // ---- 7/8: backups older than the current schema ----
  const secureBackup = require("../services/secureBackup");
  const { execFileSync } = require("child_process");
  const NEWER_TABLES = ["emergency_contacts", "user_known_devices"];
  const migrationSql = fs.readFileSync(path.join(__dirname, "..", "migrations", "migration.sql"), "utf8");

  async function publicColumns() {
    const { rows } = await pool.query(`SELECT table_name, column_name, data_type FROM information_schema.columns
      WHERE table_schema = 'public' ORDER BY table_name, column_name`);
    return rows.map((r) => `${r.table_name}.${r.column_name}:${r.data_type}`);
  }

  // One md5 per public table. Left out: sessions (the restore clears them),
  // system_settings.updated_at (maintenance is rewritten), activity_log rows logged later.
  async function fingerprint({ skip = [], maxActId }) {
    const { rows: tables } = await pool.query(`SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`);
    const out = {};
    for (const { table_name: t } of tables) {
      if (t === "session" || skip.includes(t)) continue;
      let source = `SELECT * FROM public."${t}"`;
      if (t === "system_settings") source = "SELECT key, value FROM public.system_settings";
      if (t === "activity_log") source = `SELECT * FROM public.activity_log WHERE act_id <= ${Number(maxActId)}`;
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n, md5(COALESCE(string_agg(x::text, '|' ORDER BY x::text), '')) AS h FROM (${source}) x`,
      );
      out[t] = `${rows[0].n}:${rows[0].h}`;
    }
    return out;
  }
  const maxActId = async () =>
    (await pool.query("SELECT COALESCE(MAX(act_id), 0)::int AS n FROM activity_log")).rows[0].n;
  const packDump = (dump) => secureBackup.pack(dump, ZIP_PASSWORD);
  const addNewerRows = async () => {
    await pool.query(
      `INSERT INTO emergency_contacts (agency, label, phone, sort_order, updated_by)
       VALUES ('ZZ Live Agency', 'Live line', '0912 000 0000', 99, $1)`,
      [olderAdmin.id],
    );
    await pool.query(
      `INSERT INTO user_known_devices (user_id, browser_family, os_family) VALUES ($1, 'ZZ', 'ZZ')`,
      [olderAdmin.id],
    );
  };

  // Check 6's trigger travelled with its restore and would block every later session wipe.
  await pool.query(`DROP TRIGGER IF EXISTS zz_block_session_delete ON public."session";
    DROP FUNCTION IF EXISTS zz_block_session_delete();`);
  await setMaintenance(true);
  await signInAgain(olderAdmin);
  const currentColumns = await publicColumns();

  // Older schema: this database without the two newer tables.
  await pool.query("DROP TABLE public.emergency_contacts, public.user_known_devices");
  const oldMarker = `zz-old-backup-${crypto.randomBytes(4).toString("hex")}`;
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, 'in-old-backup', NOW())`,
    [oldMarker],
  );
  const oldActId = await maxActId();
  const oldFingerprint = await fingerprint({ maxActId: oldActId });
  const oldZip = await downloadBackup(olderAdmin);
  const oldDump = await secureBackup.unpack(oldZip, ZIP_PASSWORD);

  // Back to the current schema, with rows in the newer tables that reference "user".
  await pool.query(migrationSql);
  await addNewerRows();
  const lateMarker = `zz-after-old-backup-${crypto.randomBytes(4).toString("hex")}`;
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, 'after', NOW())`,
    [lateMarker],
  );
  assert.deepEqual(await publicColumns(), currentColumns, "test setup: live schema is not current");

  async function expectLiveUnchanged(before, actId) {
    assert.deepEqual(await fingerprint({ maxActId: actId }), before, "live data changed");
    assert.deepEqual(await publicColumns(), currentColumns, "live schema changed");
    const { rows } = await pool.query(`SELECT value FROM system_settings WHERE key = 'maintenance_mode'`);
    assert.equal(rows[0].value, "true", "maintenance is off after a failed restore");
  }

  await check("8a. unlistable dump fails before anything changes", async () => {
    const actId = await maxActId();
    const before = await fingerprint({ maxActId: actId });
    const res = await restore(olderAdmin, restoreForm(await packDump(Buffer.from("PGDMP not a real dump"))));
    assert.equal(res.status, 500);
    await expectLiveUnchanged(before, actId);
  });

  await check("8b. truncated dump fails in pg_restore and the live data is put back", async () => {
    const actId = await maxActId();
    const before = await fingerprint({ maxActId: actId });
    const truncated = oldDump.subarray(0, Math.floor(oldDump.length * 0.6));
    const res = await restore(olderAdmin, restoreForm(await packDump(truncated)));
    const body = await res.json().catch(() => ({}));
    console.log(`      truncated restore: ${res.status} ${JSON.stringify(body)}`);
    assert.equal(res.status, 500);
    assert.match(body.error ?? "", /put back from the safety dump/);
    await expectLiveUnchanged(before, actId);
  });

  await check("8c. backup migration.sql cannot upgrade is put back from the safety dump", async () => {
    // emergency_contacts without its columns: pg_restore succeeds, migration.sql's INSERT fails.
    const copyDb = `${SCRATCH_DB}_m`;
    const bootstrap = makePool("postgres");
    await bootstrap.query(`CREATE DATABASE "${copyDb}"`);
    await bootstrap.end();
    const pgArgs = ["-U", process.env.DB_USER, "-h", process.env.DB_HOST, "-p", String(process.env.DB_PORT), "--no-password"];
    const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || "" };
    const work = fs.mkdtempSync(path.join(SAFETY_DIR, "m-"));
    try {
      fs.writeFileSync(path.join(work, "old.dump"), oldDump);
      execFileSync(
        process.env.PG_RESTORE_PATH || "pg_restore",
        [...pgArgs, "-d", copyDb, "--no-owner", "--no-privileges", "--exit-on-error", path.join(work, "old.dump")],
        { env },
      );
      const copy = makePool(copyDb);
      await copy.query("CREATE TABLE public.emergency_contacts (id integer)");
      await copy.end();
      execFileSync(
        process.env.PG_DUMP_PATH || "pg_dump",
        [...pgArgs, "-d", copyDb, "-F", "c", "-f", path.join(work, "bad.dump")],
        { env },
      );
      const badZip = await packDump(fs.readFileSync(path.join(work, "bad.dump")));

      const actId = await maxActId();
      const before = await fingerprint({ maxActId: actId });
      const res = await restore(olderAdmin, restoreForm(badZip));
      const body = await res.json().catch(() => ({}));
      console.log(`      unmigratable restore: ${res.status} ${JSON.stringify(body)}`);
      assert.equal(res.status, 500);
      assert.match(body.error ?? "", /put back from the safety dump/);
      await expectLiveUnchanged(before, actId);
    } finally {
      const drop = makePool("postgres");
      await drop.query(`DROP DATABASE IF EXISTS "${copyDb}" WITH (FORCE)`);
      await drop.end();
    }
  });

  fs.rmSync(SAFETY_PATH, { force: true });
  await signInAgain(olderAdmin);
  const oldRes = await restore(olderAdmin, restoreForm(oldZip));
  const oldBody = await oldRes.json().catch(() => ({}));
  console.log(`older-backup restore: ${oldRes.status} ${JSON.stringify(oldBody)}`);

  await check("7a. backup older than the schema restores", async () => {
    assert.equal(oldRes.status, 200);
  });

  await check("7b. every current table and column exists afterwards", async () => {
    assert.equal(oldRes.status, 200, "restore did not succeed");
    assert.deepEqual(await publicColumns(), currentColumns);
    const { rows } = await pool.query(`SELECT
      (SELECT COUNT(*)::int FROM emergency_contacts WHERE agency = 'ZZ Live Agency') AS live_contacts,
      (SELECT COUNT(*)::int FROM emergency_contacts) AS contacts,
      (SELECT COUNT(*)::int FROM user_known_devices) AS devices`);
    assert.equal(rows[0].live_contacts, 0, "a contact written after the backup survived");
    assert.ok(rows[0].contacts > 0, "migration.sql did not seed the default contacts");
    assert.equal(rows[0].devices, 0, "known devices written after the backup survived");
  });

  await check("7c. data equals the backup", async () => {
    assert.equal(oldRes.status, 200, "restore did not succeed");
    assert.deepEqual(await fingerprint({ skip: NEWER_TABLES, maxActId: oldActId }), oldFingerprint);
    const { rows } = await pool.query("SELECT key FROM system_settings WHERE key IN ($1, $2)", [oldMarker, lateMarker]);
    assert.deepEqual(rows.map((r) => r.key), [oldMarker]);
  });

  await check("7d. sessions cleared and maintenance on", async () => {
    assert.equal(oldRes.status, 200, "restore did not succeed");
    const { rows } = await pool.query(`SELECT
      (SELECT value FROM system_settings WHERE key = 'maintenance_mode') AS maintenance,
      (SELECT COUNT(*)::int FROM "session") AS sessions`);
    assert.equal(rows[0].maintenance, "true");
    assert.equal(rows[0].sessions, 0);
  });

  await check("7e. safety dump taken first holds the newer tables", async () => {
    assert.equal(oldRes.status, 200, "restore did not succeed");
    const dump = await secureBackup.unpack(fs.readFileSync(SAFETY_PATH), ZIP_PASSWORD);
    const dumpFile = path.join(SAFETY_DIR, "safety-check.dump");
    fs.writeFileSync(dumpFile, dump);
    const list = execFileSync(process.env.PG_RESTORE_PATH || "pg_restore", ["--list", dumpFile], { encoding: "utf8" });
    for (const t of NEWER_TABLES) {
      assert.match(list, new RegExp(`TABLE DATA public ${t} `), `safety dump lacks ${t}`);
    }
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
