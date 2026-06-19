const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function setupDatabase() {
  console.log("Starting database setup...");
  try {
    const schemaPath = path.join(__dirname, "..", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    await pool.query(schema);

    console.log("✅ Database setup completed successfully!");
  } catch (error) {
    console.error("❌ Error setting up the database:", error);
  } finally {
    await pool.end();
    process.exit();
  }
}

setupDatabase();
