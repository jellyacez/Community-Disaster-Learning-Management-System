const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// DON'T RUN THIS SCRIPT IN PRODUCTION! It will drop all tables and data in the database.
// IT IS INTENDED FOR DEVELOPMENT PURPOSES ONLY.
//
// Usage: node config/setup.js
//
// What this script does:
//   1. Connects to the default "postgres" database to create LMS_db if it doesn't exist.
//   2. Drops and recreates the public and rate_limit schemas for a clean slate.
//   3. Runs migrations/schema.sql to create all tables.

const DB_NAME = process.env.DB_DATABASE || "LMS_db";

// ── Helper: build a Pool for a specific database ─────────────────────────────
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

async function setupDatabase() {
  console.log("🚀 Starting database setup...");

  // ── Guard: warn if .env is missing ──────────────────────────────────────────
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.warn(
      "⚠️  No .env file found. Copy .env.example to .env and fill in your credentials."
    );
  }

  // ── Guard: check schema.sql exists early ────────────────────────────────────
  const schemaPath = path.join(__dirname, "..", "migrations", "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ schema.sql not found at: ${schemaPath}`);
    process.exit(1);
  }

  // ── Step 1: Connect to "postgres" DB and create LMS_db if missing ───────────
  // We must connect to a database that already exists (postgres is always there).
  // We can't connect to LMS_db if it doesn't exist yet.
  console.log(`🔌 Connecting to "postgres" database to check if "${DB_NAME}" exists...`);
  const bootstrapPool = makePool("postgres");
  const bootstrapClient = await bootstrapPool.connect().catch((err) => {
    console.error(
      `❌ Could not connect to PostgreSQL. Make sure PostgreSQL is running and your .env credentials are correct.\n   Details: ${err.message}`
    );
    process.exit(1);
  });

  try {
    const { rows } = await bootstrapClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DB_NAME]
    );

    if (rows.length === 0) {
      console.log(`📦 Database "${DB_NAME}" not found. Creating it...`);
      // Database names cannot be parameterized; sanitize manually.
      await bootstrapClient.query(`CREATE DATABASE "${DB_NAME.replace(/"/g, "")}"`);
      console.log(`✅ Database "${DB_NAME}" created.`);
    } else {
      console.log(`✅ Database "${DB_NAME}" already exists.`);
    }
  } finally {
    bootstrapClient.release();
    await bootstrapPool.end();
  }

  // ── Step 2: Connect to LMS_db and reset schemas ──────────────────────────────
  console.log(`🔌 Connecting to "${DB_NAME}"...`);
  const appPool = makePool(DB_NAME);
  const client = await appPool.connect().catch((err) => {
    console.error(`❌ Could not connect to "${DB_NAME}": ${err.message}`);
    process.exit(1);
  });

  try {
    console.log("🗑️  Resetting schemas...");
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("DROP SCHEMA IF EXISTS rate_limit CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("CREATE SCHEMA rate_limit");
    await client.query("GRANT ALL ON SCHEMA public TO postgres");
    await client.query("GRANT ALL ON SCHEMA public TO public");
    console.log("✅ Schemas reset.");

    // ── Step 3: Run schema.sql ─────────────────────────────────────────────────
    console.log("📄 Running schema.sql...");
    let schema = fs.readFileSync(schemaPath, "utf8");

    // Strip psql-only meta-commands (\restrict, \unrestrict, etc.) that the
    // pg Node.js driver does not understand and would throw a syntax error on.
    schema = schema.replace(/^\\[a-z].*$/gim, "");

    // Strip CREATE/ALTER SCHEMA statements — setup.js already creates the
    // schemas fresh above, so running them again would cause a "already exists" error.
    schema = schema.replace(/^(CREATE|ALTER)\s+SCHEMA\b.*$/gim, "");

    await client.query(schema);

    // ── Step 4: Run numbered migration/seed files in order ────────────────────
    // Any file matching /^\d+_.*\.sql$/ in the migrations folder is run in
    // alphabetical (numeric) order. This includes seed files like 04_seed_barangays.sql.
    const migrationsDir = path.join(__dirname, "..", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((f) => /^\d+.*\.sql$/i.test(f))
      .sort();

    if (migrationFiles.length > 0) {
      console.log(`\n📂 Running ${migrationFiles.length} migration/seed file(s)...`);
      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, "utf8");
        await client.query(sql);
        console.log(`   ✅ ${file}`);
      }
    }

    console.log("\n🎉 Database setup completed successfully!");
    console.log(`   Connected to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${DB_NAME}`);
  } catch (error) {
    console.error("❌ Error during schema setup:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await appPool.end();
    process.exit();
  }
}

setupDatabase();
