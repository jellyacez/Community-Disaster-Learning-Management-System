const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// DEV ONLY: drops every table and all data. Never run this against production.
//
// Usage: node config/setup.js
//   1. creates LMS_db (via the default "postgres" DB) if it doesn't exist
//   2. drops and recreates the public and rate_limit schemas
//   3. runs migrations/schema.sql

const DB_NAME = process.env.DB_DATABASE || "LMS_db";

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

  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.warn(
      "⚠️  No .env file found. Copy .env.example to .env and fill in your credentials."
    );
  }

  const schemaPath = path.join(__dirname, "..", "migrations", "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ schema.sql not found at: ${schemaPath}`);
    process.exit(1);
  }

  // LMS_db may not exist yet, so connect to the always-present postgres DB first.
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

    console.log("📄 Running schema.sql...");
    let schema = fs.readFileSync(schemaPath, "utf8");

    // pg can't run psql meta-commands (\restrict, \unrestrict, ...)
    schema = schema.replace(/^\\[a-z].*$/gim, "");

    // schemas were created above; running CREATE SCHEMA again fails with "already exists"
    schema = schema.replace(/^(CREATE|ALTER)\s+SCHEMA\b.*$/gim, "");

    // The dump assigns every object to lms_admin, which usually doesn't exist on another machine. Let objects belong to DB_USER instead.
    schema = schema.replace(/^ALTER\s+.+\s+OWNER\s+TO\s+\S+;\s*$/gim, "");

    await client.query(schema);

    // The rate_limit schema belongs to @acpr/rate-limit-postgresql, which creates its
    // tables and functions through its own migrations (tracked in its own table) on the
    // first server start. The dump already contains those objects but not the library's
    // migration history, so the library re-runs its 'init' migration and the server
    // crashes ("relation unique_session_key already exists"). Leave the schema empty so
    // the library builds it the way it expects.
    await client.query("DROP SCHEMA IF EXISTS rate_limit CASCADE");
    await client.query("CREATE SCHEMA rate_limit");

    // runs every NN_*.sql in migrations/ in numeric order, seeds included (e.g. 04_seed_barangays.sql)
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
