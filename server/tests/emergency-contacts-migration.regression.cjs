/**
 * Regression test: the emergency_contacts block in migration.sql is idempotent.
 *
 *   1. Fresh install (schema.sql -> migration.sql -> seed.sql, as config/setup.js does), then
 *      migration.sql and seed.sql again: 6 default rows, version 1, no duplicates.
 *   2. A database from before this feature (no table, no version key): migration.sql twice
 *      creates the table once and inserts the defaults once.
 *   3. After an admin edit (row changed, row deleted, version bumped), migration.sql and seed.sql
 *      leave the data and the version alone.
 *   4. The defaults: 911 is the only non-sample row and every phone passes the CHECK.
 *
 * Creates its own scratch database (lms_ec_mig_<random>) on the loopback server from server/.env
 * and drops it at the end. Never touches DB_DATABASE.
 *
 * Run from the repo root:  node server/tests/emergency-contacts-migration.regression.cjs
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const SCRATCH_DB = `lms_ec_mig_${crypto.randomBytes(4).toString("hex")}`;
const MIGRATIONS = path.join(__dirname, "..", "migrations");
const read = (file) => fs.readFileSync(path.join(MIGRATIONS, file), "utf8");

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

async function state(db) {
  const table = await db.query("SELECT to_regclass('public.emergency_contacts') AS t");
  if (!table.rows[0].t) return { table: false };
  const { rows } = await db.query(
    "SELECT agency, label, phone, is_sample, sort_order, active FROM public.emergency_contacts ORDER BY sort_order, id"
  );
  const v = await db.query("SELECT value FROM public.system_settings WHERE key = 'emergency_contacts_version'");
  return { table: true, rows, version: v.rows[0]?.value ?? null };
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

const EXPECTED = [
  ["National Emergency", "Emergency hotline", "911", false],
  ["MDRRMO Bacolor", "Globe", "0987 654 3210", true],
  ["MDRRMO Bacolor", "Smart", "0987 654 3210", true],
  ["MDRRMO Bacolor", "Landline", "045 900-0199", true],
  ["BFP Bacolor", "Fire station", "0987 654 3210", true],
  ["PNP Bacolor", "Police station", "0987 654 3210", true],
];
const summary = (rows) => rows.map((r) => [r.agency, r.label, r.phone, r.is_sample]);

async function main() {
  const bootstrap = makePool("postgres");
  await bootstrap.query(`CREATE DATABASE "${SCRATCH_DB}"`);
  await bootstrap.end();
  const db = makePool(SCRATCH_DB);

  try {
    const { rows } = await db.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
    console.log(`scratch database: ${rows[0].db} @ ${rows[0].addr ?? "unix socket"}`);
    if (rows[0].db !== SCRATCH_DB) throw new Error("Connected to the wrong database.");

    await check("fresh install, then migration.sql and seed.sql again: 6 defaults, version 1", async () => {
      await loadSchema(db);
      await db.query(read("migration.sql"));
      await db.query(read("seed.sql"));
      const first = await state(db);
      assert.equal(first.table, true, "table missing after migration.sql");
      assert.deepEqual(summary(first.rows), EXPECTED);
      assert.equal(first.version, "1");
      await db.query(read("migration.sql"));
      await db.query(read("seed.sql"));
      assert.deepEqual(await state(db), first);
    });

    await check("defaults: 911 is the only dialable row, sort_order is 1..6, all active", async () => {
      const s = await state(db);
      assert.deepEqual(s.rows.filter((r) => !r.is_sample).map((r) => r.phone), ["911"]);
      assert.deepEqual(s.rows.map((r) => r.sort_order), [1, 2, 3, 4, 5, 6]);
      assert.ok(s.rows.every((r) => r.active));
    });

    await check("pre-feature database: migration.sql twice creates the table and defaults once", async () => {
      await db.query("DROP TABLE public.emergency_contacts");
      await db.query("DELETE FROM public.system_settings WHERE key = 'emergency_contacts_version'");
      assert.equal((await state(db)).table, false);
      await db.query(read("migration.sql"));
      await db.query(read("migration.sql"));
      const s = await state(db);
      assert.deepEqual(summary(s.rows), EXPECTED);
      assert.equal(s.version, "1");
    });

    await check("after an admin edit, migration.sql and seed.sql leave data and version alone", async () => {
      await db.query("UPDATE public.emergency_contacts SET phone = '0918 555 6666', is_sample = false WHERE label = 'Globe'");
      await db.query("DELETE FROM public.emergency_contacts WHERE label = 'Police station'");
      await db.query("UPDATE public.system_settings SET value = '7' WHERE key = 'emergency_contacts_version'");
      const edited = await state(db);
      await db.query(read("migration.sql"));
      await db.query(read("seed.sql"));
      await db.query(read("migration.sql"));
      assert.deepEqual(await state(db), edited);
      assert.equal(edited.rows.length, 5);
      assert.equal(edited.version, "7");
    });

    await check("the table refuses bad rows (CHECK constraints)", async () => {
      const bad = [
        ["", "x", "911"],
        ["x", "x", "(045) 900-0199"],
        ["x", "x", "0917,123"],
        ["x", "x", "0918-"],
      ];
      for (const [agency, label, phone] of bad) {
        await assert.rejects(
          db.query(
            "INSERT INTO public.emergency_contacts (agency, label, phone, sort_order) VALUES ($1, $2, $3, 99)",
            [agency, label, phone]
          ),
          /check constraint/i,
          `accepted ${JSON.stringify([agency, label, phone])}`
        );
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
