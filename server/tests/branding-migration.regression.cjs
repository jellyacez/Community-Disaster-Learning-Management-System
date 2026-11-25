/**
 * Regression test: the branding block in migration.sql and seed.sql (docs/specs/branding.md).
 *
 *   1. Fresh install (schema.sql -> migration.sql -> seed.sql, as config/setup.js does): the system name
 *      is "Bacolor Disaster LMS" and branding_version is 1; running both again changes nothing.
 *   2. An existing install still on the old, never-shown seed name gets "Bacolor Disaster LMS".
 *   3. A name an admin saved, and a bumped branding_version, survive migration.sql and seed.sql.
 *
 * Creates its own scratch database (lms_c_brmig_<random>) on the loopback server from server/.env
 * and drops it at the end. Never touches DB_DATABASE.
 *
 * Run from the repo root:  node server/tests/branding-migration.regression.cjs
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const SCRATCH_DB = `lms_c_brmig_${crypto.randomBytes(4).toString("hex")}`;
const MIGRATIONS = path.join(__dirname, "..", "migrations");
const read = (file) => fs.readFileSync(path.join(MIGRATIONS, file), "utf8");
const OLD_SEED_NAME = "Community Disaster Learning Management System";

if (!/^(localhost|127\.\d+\.\d+\.\d+|::1)$/i.test(process.env.DB_HOST || "")) {
  throw new Error(`Refusing to run: DB_HOST (${process.env.DB_HOST}) is not a loopback address.`);
}

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

// Mirrors config/setup.js, only ever against SCRATCH_DB.
async function loadSchema(db) {
  await db.query("DROP SCHEMA IF EXISTS public CASCADE");
  await db.query("DROP SCHEMA IF EXISTS rate_limit CASCADE");
  await db.query("CREATE SCHEMA public");
  await db.query("CREATE SCHEMA rate_limit");
  const schema = read("schema.sql")
    .replace(/^\\[a-z].*$/gim, "")
    .replace(/^(CREATE|ALTER)\s+SCHEMA\b.*$/gim, "")
    .replace(/^ALTER\s+.+\s+OWNER\s+TO\s+\S+;\s*$/gim, "");
  await db.query(schema);
  await db.query("DROP SCHEMA IF EXISTS rate_limit CASCADE");
  await db.query("CREATE SCHEMA rate_limit");
}

async function branding(db) {
  const { rows } = await db.query(
    "SELECT key, value FROM public.system_settings WHERE key IN ('system_name', 'branding_version') ORDER BY key"
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`ok - ${name}`);
  } catch (err) {
    results.push(false);
    console.log(`not ok - ${name}\n      ${err.message.split("\n")[0]}`);
  }
}

async function main() {
  const bootstrap = makePool("postgres");
  await bootstrap.query(`CREATE DATABASE "${SCRATCH_DB}"`);
  await bootstrap.end();
  const db = makePool(SCRATCH_DB);

  try {
    const { rows } = await db.query("SELECT current_database() AS db");
    if (rows[0].db !== SCRATCH_DB) throw new Error("Connected to the wrong database.");
    console.log(`scratch database: ${SCRATCH_DB}`);

    await check("fresh install: 'Bacolor Disaster LMS', version 1; a second run changes nothing", async () => {
      await loadSchema(db);
      await db.query(read("migration.sql"));
      await db.query(read("seed.sql"));
      const first = await branding(db);
      assert.deepEqual(first, { branding_version: "1", system_name: "Bacolor Disaster LMS" });
      await db.query(read("migration.sql"));
      await db.query(read("seed.sql"));
      assert.deepEqual(await branding(db), first);
    });

    await check("an install still on the old seed name gets 'Bacolor Disaster LMS'", async () => {
      await db.query("UPDATE public.system_settings SET value = $1 WHERE key = 'system_name'", [OLD_SEED_NAME]);
      await db.query("DELETE FROM public.system_settings WHERE key = 'branding_version'");
      await db.query(read("migration.sql"));
      assert.deepEqual(await branding(db), { branding_version: "1", system_name: "Bacolor Disaster LMS" });
    });

    await check("a saved name (even one close to the old seed text) and a bumped version are kept", async () => {
      for (const saved of ["Pampanga DRRM Academy", `${OLD_SEED_NAME} `, OLD_SEED_NAME.toLowerCase()]) {
        await db.query("UPDATE public.system_settings SET value = $1 WHERE key = 'system_name'", [saved]);
        await db.query("UPDATE public.system_settings SET value = '9' WHERE key = 'branding_version'");
        await db.query(read("migration.sql"));
        await db.query(read("seed.sql"));
        assert.deepEqual(await branding(db), { branding_version: "9", system_name: saved });
      }
    });
  } finally {
    await db.end();
    const drop = makePool("postgres");
    await drop.query(`DROP DATABASE IF EXISTS "${SCRATCH_DB}" WITH (FORCE)`);
    const { rows } = await drop.query("SELECT COUNT(*)::int AS n FROM pg_database WHERE datname = $1", [SCRATCH_DB]);
    await drop.end();
    console.log(`dropped ${SCRATCH_DB}: ${rows[0].n === 0}`);
  }

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
