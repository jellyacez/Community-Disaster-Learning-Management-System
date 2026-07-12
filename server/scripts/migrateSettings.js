const pool = require('../config/db');

async function migrate() {
  try {
    console.log("Adding settings column to user table...");
    await pool.query(`
      ALTER TABLE "user" 
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"announcements": true, "reminders": true}'
    `);
    console.log("Migration successful!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    pool.end();
  }
}

migrate();
