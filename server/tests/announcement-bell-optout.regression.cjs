/**
 * Regression test (audit P3-05): the "System Announcements" toggle in Settings stored
 * settings.announcements but nothing read it. Announcements create no notification rows or
 * emails; the only place a resident is alerted outside the Announcements page is the bell
 * (NotificationDropdown.jsx), which showed the newest announcements to everyone.
 *
 * Decision: the toggle filters the bell only. GET /api/user/dashboard gains bellAnnouncements,
 * the bell's feed: the newest announcements for an opted-in or unset resident, and only urgent
 * advisories still in effect for an opted-out one. The dashboard's own `announcements` field
 * and GET /api/users/announcements keep every announcement for everyone.
 *
 * Fixtures: three municipality-wide announcements dated in the future so they are the newest:
 * a standard one, an urgent one in effect, and an urgent one that has expired.
 *
 * Asserts, over HTTP against a RUNNING LOCAL server, for an opted-out, an opted-in and an
 * unset resident:
 *   - bellAnnouncements: opted out -> the in-effect urgent first, no standard, no expired;
 *     opted in and unset -> standard, urgent, expired (newest first)
 *   - dashboard `announcements` and GET /api/users/announcements still hold all three
 *
 * Fixtures are seeded in SQL and removed by exact id. Refuses non-loopback databases.
 * Run from the repo root:  node server/tests/announcement-bell-optout.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "announcement-bell-optout-regression/1.0";
const RUN = `regress_ab_${crypto.randomBytes(4).toString("hex")}`;
const created = { userIds: [], announcementIds: [] };
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`not ok - ${name}: ${err.message.split("\n")[0]}`);
  }
}

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role, settingsJson) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt"${settingsJson ? ", settings" : ""})
     VALUES ($1, $2, $3, true, $4, false, false, false, NOW(), NOW()${settingsJson ? ", $5::jsonb" : ""})`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, role, ...(settingsJson ? [settingsJson] : [])]
  );
  created.userIds.push(id);
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

async function createAnnouncement(authorId, title, priority, dateSql, expiresSql) {
  const { rows } = await pool.query(
    `INSERT INTO announcements (title, content, date, author_id, barangay_id, priority, expires_at)
     VALUES ($1, $2, ${dateSql}, $3, NULL, $4, ${expiresSql}) RETURNING id`,
    [`${RUN} ${title}`, `${title} body`, authorId, priority]
  );
  created.announcementIds.push(rows[0].id);
  return rows[0].id;
}

async function get(user, path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function cleanup() {
  await pool.query("DELETE FROM announcements WHERE id = ANY($1)", [created.announcementIds]);
  const ids = created.userIds;
  await pool.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [ids]);
  await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [ids]);
  const left = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE id = ANY($1)`, [ids]);
  const leftA = await pool.query("SELECT COUNT(*)::int AS n FROM announcements WHERE id = ANY($1)", [created.announcementIds]);
  console.log(`cleanup: ${left.rows[0].n} fixture users, ${leftA.rows[0].n} fixture announcements left`);
}

async function main() {
  await assertLocalDatabase();

  const author = await createUser("author", "mdrrmo_admin");
  const standard = await createAnnouncement(author.id, "standard", "standard", "NOW() + INTERVAL '3 minutes'", "NULL");
  const urgent = await createAnnouncement(author.id, "urgent in effect", "urgent", "NOW() + INTERVAL '2 minutes'", "NOW() + INTERVAL '1 day'");
  const expired = await createAnnouncement(author.id, "urgent expired", "urgent", "NOW() + INTERVAL '1 minute'", "NOW() - INTERVAL '1 hour'");
  const all = [standard, urgent, expired];

  const residents = {
    "opted out": await createUser("out", "resident", '{"announcements": false, "reminders": true}'),
    "opted in": await createUser("in", "resident", '{"announcements": true, "reminders": true}'),
    unset: await createUser("unset", "resident", "{}"),
  };

  for (const [label, user] of Object.entries(residents)) {
    const dash = await get(user, "/api/user/dashboard");
    await check(`${label}: GET /api/user/dashboard 200`, () => assert.equal(dash.status, 200, JSON.stringify(dash.body)));

    const data = dash.body?.data;
    const bell = data?.bellAnnouncements;
    if (label === "opted out") {
      await check(`${label}: bell shows the in-effect urgent advisory first`, () => {
        assert.ok(Array.isArray(bell), `bellAnnouncements is ${JSON.stringify(bell)}`);
        assert.equal(bell[0]?.id, urgent, JSON.stringify(bell.map((a) => a.id)));
      });
      await check(`${label}: bell hides the standard announcement and the expired advisory`, () => {
        assert.ok(Array.isArray(bell), `bellAnnouncements is ${JSON.stringify(bell)}`);
        const ids = bell.map((a) => a.id);
        assert.ok(!ids.includes(standard), `standard ${standard} in ${JSON.stringify(ids)}`);
        assert.ok(!ids.includes(expired), `expired ${expired} in ${JSON.stringify(ids)}`);
      });
    } else {
      await check(`${label}: bell shows standard, urgent and expired, newest first`, () => {
        assert.ok(Array.isArray(bell), `bellAnnouncements is ${JSON.stringify(bell)}`);
        assert.deepEqual(bell.slice(0, 3).map((a) => a.id), all);
      });
    }

    await check(`${label}: dashboard announcements still hold all three`, () => {
      const ids = (data?.announcements || []).slice(0, 3).map((a) => a.id);
      assert.deepEqual(ids, all, JSON.stringify(ids));
    });

    const page = await get(user, "/api/users/announcements?limit=100");
    await check(`${label}: GET /api/users/announcements still returns all three`, () => {
      assert.equal(page.status, 200, JSON.stringify(page.body));
      const ids = (page.body?.announcements || []).map((a) => a.id);
      for (const id of all) assert.ok(ids.includes(id), `${id} missing from ${JSON.stringify(ids)}`);
    });
  }
}

main()
  .catch((err) => {
    failed++;
    console.error("not ok - run aborted:", err);
  })
  .finally(async () => {
    try { await cleanup(); } catch (e) { failed++; console.error("cleanup failed:", e.message); }
    await pool.end();
    console.log(failed ? `FAILED (${failed})` : "PASS");
    process.exit(failed ? 1 : 0);
  });
