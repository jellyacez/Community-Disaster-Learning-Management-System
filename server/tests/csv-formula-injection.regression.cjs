/**
 * Regression test: the activity-log CSV exports let spreadsheet formulas through.
 *
 * GET /api/admin/activity-log/export (system), /api/admin/mdrrmo/activity-log/export (MDRRMO) and
 * /api/admin/super/activity-log/export (super admin) each had their own escapeCsv that quoted
 * commas, quotes and newlines but left a cell starting with = + - @ tab or CR as is, so a user
 * name, email, IP or log line such as =HYPERLINK(...) ran as a formula when the file was opened in
 * Excel. Such a cell must now start with a single quote ('), inside the usual CSV quoting, and a
 * normal row must come out byte-for-byte as before.
 *
 * Fixtures (one author user and one activity_log row per payload, the three admin callers and
 * their sessions) are seeded directly into the database and removed by exact id in `finally`.
 * Refuses to run unless the database is on loopback.
 *
 * Run from the repo root:  node server/tests/csv-formula-injection.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "csv-formula-injection-regression/1.0";
const RUN = `regress_csv_${crypto.randomBytes(4).toString("hex")}`;

// Every OWASP leading character; the first and fourth also need CSV quoting (quote, comma)
const PAYLOADS = [
  '=HYPERLINK("http://x.invalid","c")',
  "+1+1",
  "-2+3",
  "@SUM(1,1)",
  "\t=1+1",
  "\r=1+1",
];

const created = { userIds: [], actIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function insertUser(id, name, email, role) {
  // Admin roles require MFA; the flag stands in for an enrolled second factor
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, NOW(), NOW())`,
    [id, name, email, role]
  );
  created.userIds.push(id);
}

async function createCaller(label, role) {
  const id = `${RUN}_${label}`;
  await insertUser(id, `Regression ${label}`, `${id}@regression.invalid`, role);
  const ctx = await auth.$context;
  const token = crypto.randomBytes(24).toString("hex");
  await pool.query(
    `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
     VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW(), NOW(), '127.0.0.1', $3, $4)`,
    [`${id}_session`, token, UA, id]
  );
  const signature = crypto.createHmac("sha256", ctx.secret).update(token).digest("base64");
  return { id, cookie: `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}` };
}

async function insertLog(userId, actLog, ip) {
  const { rows } = await pool.query(
    `INSERT INTO activity_log (user_id, act_date, act_log, ip_address) VALUES ($1, NOW(), $2, $3)
     RETURNING act_id, act_date`,
    [userId, actLog, ip]
  );
  created.actIds.push(rows[0].act_id);
  return rows[0];
}

// The quoting the exports already did: wrap when the text has a comma, quote, LF or CR
function quote(s) {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const neutral = (s) => quote(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

// The export's own row for one act_id: rows are joined with \n but quoted cells can hold one
function findRow(csv, actId) {
  const lines = csv.split("\n");
  const start = lines.findIndex((l) => l.startsWith(`${actId},`));
  assert.ok(start > 0, `act_id ${actId} not in the export`);
  let row = lines[start];
  // An odd number of quote characters means a quoted cell runs onto the next line
  while ((row.match(/"/g) || []).length % 2 === 1) row += `\n${lines[start + (row.split("\n").length)]}`;
  return row;
}

async function exportCsv(caller, path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { "User-Agent": UA, Cookie: caller.cookie } });
  const text = await res.text();
  assert.equal(res.status, 200, text.slice(0, 300));
  assert.match(res.headers.get("content-type") || "", /text\/csv/);
  return text;
}

async function cleanup() {
  const { userIds, actIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM activity_log WHERE act_id = ANY($1) OR user_id = ANY($2)", [actIds, userIds]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [userIds]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  const { rows } = await pool.query(
    `SELECT (SELECT COUNT(*)::int FROM "user" WHERE id = ANY($1)) AS users,
            (SELECT COUNT(*)::int FROM activity_log WHERE act_id = ANY($2) OR user_id = ANY($1)) AS logs`,
    [userIds, actIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const failures = [];
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (err) {
      failures.push(name);
      console.log(`not ok - ${name}\n  ${String(err.message).split("\n").join("\n  ")}`);
    }
  };

  try {
    const system = await createCaller("system", "system_admin");
    const mdrrmo = await createCaller("mdrrmo", "mdrrmo_admin");
    const superAdmin = await createCaller("super", "super_admin");

    // One resident-authored row per payload: name, email, IP and log line all start with it
    const fixtures = [];
    for (const [i, p] of PAYLOADS.entries()) {
      const uid = `${RUN}_p${i}`;
      const email = `${p}${uid}@regression.invalid`;
      await insertUser(uid, p, email, "resident");
      const log = await insertLog(uid, p, p);
      fixtures.push({ p, uid, email, log });
    }
    const normalUid = `${RUN}_normal`;
    const normalEmail = `${normalUid}@regression.invalid`;
    await insertUser(normalUid, "Normal Person", normalEmail, "resident");
    const normalLog = await insertLog(normalUid, 'Logged in, from "home"', "127.0.0.1");
    const normalIso = new Date(normalLog.act_date).toISOString();

    const exports = [
      { name: "system", caller: system, path: "/api/admin/activity-log/export", email: false },
      { name: "MDRRMO", caller: mdrrmo, path: "/api/admin/mdrrmo/activity-log/export", email: false },
      { name: "super admin", caller: superAdmin, path: "/api/admin/super/activity-log/export", email: true },
    ];

    for (const ex of exports) {
      const csv = await exportCsv(ex.caller, ex.path);

      for (const f of fixtures) {
        await check(`${ex.name} export prefixes ' to cells starting with ${JSON.stringify(f.p.slice(0, 2))}`, () => {
          const iso = new Date(f.log.act_date).toISOString();
          const cells = [f.log.act_id, f.uid, neutral(f.p)];
          if (ex.email) cells.push(neutral(f.email));
          cells.push("resident", neutral(f.p), iso, neutral(f.p));
          assert.equal(JSON.stringify(findRow(csv, f.log.act_id)), JSON.stringify(cells.join(",")));
        });
      }

      await check(`${ex.name} export leaves a normal row byte-for-byte as before`, () => {
        const expected = ex.email
          ? `${normalLog.act_id},${normalUid},Normal Person,${normalEmail},resident,127.0.0.1,${normalIso},"Logged in, from ""home"""`
          : `${normalLog.act_id},${normalUid},Normal Person,resident,127.0.0.1,${normalIso},"Logged in, from ""home"""`;
        assert.equal(findRow(csv, normalLog.act_id), expected);
      });
    }
  } finally {
    await cleanup();
    await pool.end();
  }

  if (failures.length) {
    console.log(`\n${failures.length} check(s) failed`);
    process.exit(1);
  }
  console.log("\nall checks passed");
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
