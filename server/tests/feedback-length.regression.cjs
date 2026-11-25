/**
 * Regression test: feedback text had no length limit (audit P5-06, V-04).
 *
 * POST /api/feedbacks stored a 200,000-character subject, and both reply routes
 * (resident PUT /api/feedbacks/:id/reply, admin PUT /api/admin/mdrrmo/feedback/:id/reply,
 * which barangay admins use too) accepted 200,000-character replies. The limits now:
 * subject 255, message 5000, reply 5000 characters, counted as JS string length after
 * sanitizeMiddleware (the stored text). Over the limit is a 400 with a message the client
 * toasts, and nothing is written; exactly at the limit is accepted.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Users, sessions and tickets are seeded
 * directly into the database and removed by exact ID in `finally`. Refuses a non-loopback database.
 *
 * Run from the repo root:  node server/tests/feedback-length.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "feedback-length-regression/1.0";
const RUN = `regress_fl_${crypto.randomBytes(4).toString("hex")}`;
const BARANGAY_ID = 1;

const created = { userIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role, barangayId = null) {
  const id = `${RUN}_${label}`;
  // Admin roles require MFA; the flag stands in for an enrolled second factor
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, barangay_id, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, $5, true, false, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, role, barangayId]
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

async function createTicket(user, recipient) {
  const { rows } = await pool.query(
    `INSERT INTO feedbacks (user_id, recipient, type, subject, message, status)
     VALUES ($1, $2, 'Inquiry', $3, 'Seeded ticket', 'Pending') RETURNING id`,
    [user.id, recipient, `${RUN} ${recipient}`]
  );
  return rows[0].id;
}

async function call(user, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const countFeedbacks = async (userId) =>
  (await pool.query("SELECT COUNT(*)::int AS n FROM feedbacks WHERE user_id = $1", [userId])).rows[0].n;

const ticketState = async (id) =>
  (
    await pool.query(
      `SELECT f.status, (SELECT COUNT(*)::int FROM feedback_messages m WHERE m.feedback_id = f.id) AS messages
       FROM feedbacks f WHERE f.id = $1`,
      [id]
    )
  ).rows[0];

const lastMessageLength = async (id) =>
  (
    await pool.query(
      "SELECT length(message) AS len FROM feedback_messages WHERE feedback_id = $1 ORDER BY id DESC LIMIT 1",
      [id]
    )
  ).rows[0].len;

// 400, nothing else, and a `message` the client's toast and sync queue read
function assertTooLong(res, label, max) {
  assert.equal(res.status, 400, `status ${res.status}: ${JSON.stringify(res.body)?.slice(0, 200)}`);
  assert.equal(res.body.message, `${label} must be ${max} characters or fewer.`, JSON.stringify(res.body));
}

async function cleanup() {
  const { userIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM feedback_messages WHERE feedback_id IN (SELECT id FROM feedbacks WHERE user_id = ANY($1)) OR sender_id = ANY($1)",
      [userIds]
    );
    await client.query("DELETE FROM feedbacks WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM user_notification WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
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
    `SELECT
       (SELECT COUNT(*)::int FROM "user" WHERE id = ANY($1)) AS users,
       (SELECT COUNT(*)::int FROM feedbacks WHERE user_id = ANY($1)) AS feedbacks,
       (SELECT COUNT(*)::int FROM feedback_messages WHERE sender_id = ANY($1)) AS messages`,
    [userIds]
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
      console.log(`not ok - ${name}: ${err.message.split("\n")[0]}`);
    }
  };

  const resident = await createUser("resident", "resident", BARANGAY_ID);
  const mdrrmo = await createUser("mdrrmo", "mdrrmo_admin");
  const brgyAdmin = await createUser("brgy", "barangay_admin", BARANGAY_ID);
  const mdrrmoTicket = await createTicket(resident, "mdrrmo");
  const brgyTicket = await createTicket(resident, "barangay");
  const base = { recipient: "mdrrmo", type: "inquiry", subject: "Flood", message: "Water rising" };

  // POST /api/feedbacks
  await check("submit: 256-character subject is a 400 and stores nothing", async () => {
    const before = await countFeedbacks(resident.id);
    const res = await call(resident, "POST", "/api/feedbacks", { ...base, subject: "s".repeat(256) });
    assertTooLong(res, "Subject", 255);
    assert.equal(await countFeedbacks(resident.id), before, "a ticket was stored");
  });
  await check("submit: 5001-character message is a 400 and stores nothing", async () => {
    const before = await countFeedbacks(resident.id);
    const res = await call(resident, "POST", "/api/feedbacks", { ...base, message: "m".repeat(5001) });
    assertTooLong(res, "Message", 5000);
    assert.equal(await countFeedbacks(resident.id), before, "a ticket was stored");
  });
  await check("submit: 200,000-character subject (audit repro) is a 400", async () => {
    const res = await call(resident, "POST", "/api/feedbacks", { ...base, subject: "s".repeat(200000) });
    assertTooLong(res, "Subject", 255);
  });
  await check("submit: 255-character subject and 5000-character message are accepted", async () => {
    const res = await call(resident, "POST", "/api/feedbacks", { ...base, subject: "s".repeat(255), message: "m".repeat(5000) });
    assert.equal(res.status, 201, JSON.stringify(res.body)?.slice(0, 200));
    const { rows } = await pool.query("SELECT length(subject) AS s, length(message) AS m FROM feedbacks WHERE id = $1", [res.body.data.id]);
    assert.deepEqual(rows[0], { s: 255, m: 5000 });
  });
  await check("submit: length is counted after HTML is stripped (tags around 5000 characters are accepted)", async () => {
    const res = await call(resident, "POST", "/api/feedbacks", { ...base, message: `<b>${"m".repeat(5000)}</b>` });
    assert.equal(res.status, 201, JSON.stringify(res.body)?.slice(0, 200));
  });

  // PUT /api/feedbacks/:id/reply (resident)
  await check("resident reply: 5001 characters is a 400 and adds no message", async () => {
    const before = await ticketState(mdrrmoTicket);
    const res = await call(resident, "PUT", `/api/feedbacks/${mdrrmoTicket}/reply`, { reply: "r".repeat(5001) });
    assertTooLong(res, "Reply", 5000);
    assert.deepEqual(await ticketState(mdrrmoTicket), before, "the ticket changed");
  });
  await check("resident reply: 5000 characters is accepted", async () => {
    const res = await call(resident, "PUT", `/api/feedbacks/${mdrrmoTicket}/reply`, { reply: "r".repeat(5000) });
    assert.equal(res.status, 200, JSON.stringify(res.body)?.slice(0, 200));
    assert.equal(await lastMessageLength(mdrrmoTicket), 5000);
  });

  // PUT /api/admin/mdrrmo/feedback/:id/reply (MDRRMO and barangay admins)
  for (const [who, admin, ticket] of [["mdrrmo admin", mdrrmo, mdrrmoTicket], ["barangay admin", brgyAdmin, brgyTicket]]) {
    await check(`${who} reply: 5001 characters is a 400 and changes nothing`, async () => {
      const before = await ticketState(ticket);
      const res = await call(admin, "PUT", `/api/admin/mdrrmo/feedback/${ticket}/reply`, { reply: "a".repeat(5001), status: "Replied" });
      assertTooLong(res, "Reply", 5000);
      assert.deepEqual(await ticketState(ticket), before, "the ticket changed");
    });
    await check(`${who} reply: 5000 characters is accepted`, async () => {
      const res = await call(admin, "PUT", `/api/admin/mdrrmo/feedback/${ticket}/reply`, { reply: "a".repeat(5000), status: "Replied" });
      assert.equal(res.status, 200, JSON.stringify(res.body)?.slice(0, 200));
      assert.equal(await lastMessageLength(ticket), 5000);
    });
  }

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):\n  - ${failures.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    console.log("All feedback length regression checks passed.");
  }
}

main()
  .catch((err) => {
    console.error("FAILED:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("cleanup failed:", err.message);
      process.exitCode = 1;
    }
    await pool.end();
  });
