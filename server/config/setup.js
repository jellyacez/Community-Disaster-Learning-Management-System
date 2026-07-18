const fs = require("fs");
const path = require("path");
const pool = require("./db");

// DON'T RUN THIS SCRIPT IN PRODUCTION! It will drop all tables and data in the database.
// IT IS INTENDED FOR DEVELOPMENT PURPOSES ONLY.
async function setupDatabase() {
  console.log("Starting database setup...");
  const client = await pool.connect();
  try {
    // ── Step 1: Clean slate ──────────────────────────────────────────────────
    // Drop existing schemas (CASCADE removes all tables/functions inside them)
    // and recreate them fresh. This makes the script safe to re-run at any time.
    console.log("🗑️  Resetting schemas...");
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("DROP SCHEMA IF EXISTS rate_limit CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("CREATE SCHEMA rate_limit");
    await client.query("GRANT ALL ON SCHEMA public TO postgres");
    await client.query("GRANT ALL ON SCHEMA public TO public");
    console.log("✅ Schemas reset.");

    // ── Step 2: Run schema.sql ───────────────────────────────────────────────
    console.log("📄 Running schema.sql...");
    const schemaPath = path.join(__dirname, "..", "migrations", "schema.sql");

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, "utf8");
    await client.query(schema);

    console.log("✅ Database setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up the database:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
    process.exit();
  }
}

setupDatabase();
