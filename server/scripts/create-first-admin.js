// One-time CLI for handover: create the first system_admin, or promote an existing account.
//
//   npm run create-first-admin -- --email admin@example.org --name "Full Name"
//   npm run create-first-admin -- --email existing.user@example.org        (promote)
//
// The password comes from FIRST_ADMIN_PASSWORD or a hidden prompt, never from the command
// line (shell history and the process list would keep it), and is never printed.
// Refuses if any system_admin already exists, and under NODE_ENV=production unless
// --i-understand is passed. Uses the database configured in server/.env.
const path = require("path");
const readline = require("readline");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const LOCK_KEY = 72730001; // pg_advisory_lock key so two runs can't both pass the check

function fail(message) {
  console.error(`create-first-admin: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { email: null, name: null, iUnderstand: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (/^--password(=|$)/.test(arg)) {
      fail("Don't pass the password on the command line. Set FIRST_ADMIN_PASSWORD or type it at the prompt.");
    } else if (arg === "--email") args.email = argv[++i];
    else if (arg === "--name") args.name = argv[++i];
    else if (arg === "--i-understand") args.iUnderstand = true;
    else fail(`Unknown argument: ${arg}`);
  }
  return args;
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    // Echo nothing while the password is typed.
    rl._writeToOutput = () => {};
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function readPassword() {
  if (process.env.FIRST_ADMIN_PASSWORD) return process.env.FIRST_ADMIN_PASSWORD;
  if (!process.stdin.isTTY) {
    fail("No password: set FIRST_ADMIN_PASSWORD or run this in an interactive terminal.");
  }
  const first = await promptHidden("Password for the new system_admin: ");
  const second = await promptHidden("Repeat the password: ");
  if (first !== second) fail("The passwords don't match. Nothing changed.");
  return first;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (process.env.NODE_ENV === "production" && !args.iUnderstand) {
    fail("Refusing to run with NODE_ENV=production. Re-run with --i-understand if this is the intended database.");
  }
  if (!args.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
    fail("Pass --email with a valid address.");
  }

  const pool = require("../config/db");
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);

    const admins = await client.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE role = 'system_admin'`);
    if (admins.rows[0].n > 0) {
      fail("A system_admin already exists. Nothing changed; add more admins from the admin console.");
    }

    const existing = await client.query(
      `SELECT id, email FROM "user" WHERE LOWER(email) = LOWER($1)`,
      [args.email.trim()],
    );
    const { logActivity } = require("../utils/logger");

    if (existing.rows.length > 0) {
      const { id, email } = existing.rows[0];
      await client.query(
        `UPDATE "user" SET role = 'system_admin', "emailVerified" = true, "updatedAt" = NOW() WHERE id = $1`,
        [id],
      );
      await logActivity(id, "System admin account promoted via CLI (create-first-admin)");
      console.log(`Promoted ${email} (${id}) to system_admin. Their existing password is unchanged.`);
      return;
    }

    if (!args.name || !args.name.trim()) fail("Pass --name for a new account.");
    const password = await readPassword();
    const { auth } = require("../utils/auth");
    // Same path as admin provisioning (provisionAdmin.js), so the password is hashed alike.
    const created = await auth.api.createUser({
      body: {
        email: args.email.trim(),
        password,
        name: args.name.trim(),
        role: "system_admin",
        data: { barangay: "Unassigned" },
      },
    });
    const id = created.user.id;
    await client.query(`UPDATE "user" SET "emailVerified" = true WHERE id = $1`, [id]);
    await logActivity(id, "System admin account created via CLI (create-first-admin)");
    console.log(`Created system_admin ${created.user.email} (${id}). Sign in with the password you set.`);
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]).catch(() => {});
    client.release();
    await pool.end().catch(() => {});
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // Better Auth and pg messages describe the problem without echoing the password.
    fail(err?.body?.message || err?.message || "Unexpected error.");
  });
