/**
 * Regression test: feedback reply and close routes took any :id and any reply (audit M8).
 *
 * PUT /api/feedbacks/:id/reply (resident), PUT /api/admin/mdrrmo/feedback/:id/reply and
 * PUT /api/admin/mdrrmo/feedback/:id/close (MDRRMO and barangay admins) passed :id straight
 * to `WHERE f.id = $1` on an integer column, so "abc", "1.5" or 2147483648 was a 500. Both
 * reply routes only checked `!reply`, so 123, {}, ["x"] or whitespace-only text was stored.
 * Now :id must be a positive int4 and reply a non-blank string, else a 400 with a `message`
 * that changes nothing. A valid id that matches no ticket stays a 404; the admin status stays
 * limited to Replied/Closed.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Users, sessions and tickets are seeded
 * directly into the database and removed by exact ID in `finally`. Refuses a non-loopback database.
 *
 * Run from the repo root:  node server/tests/feedback-reply-input.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "feedback-reply-input-regression/1.0";
const RUN = `regress_fri_${crypto.randomBytes(4).toString("hex")}`;
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

const ticketState = async (id) =>
  (
    await pool.query(
      `SELECT f.status, (SELECT COUNT(*)::int FROM feedback_messages m WHERE m.feedback_id = f.id) AS messages
       FROM feedbacks f WHERE f.id = $1`,
      [id]
    )
  ).rows[0];
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
  const closeTicket = await createTicket(resident, "mdrrmo");

  // adminWriteLimiter allows 20 writes per admin per 15 minutes, so each group gets its own admin
  let n = 0;
  const freshMdrrmo = () => createUser(`mdrrmo${++n}`, "mdrrmo_admin");
  const freshBrgy = () => createUser(`brgy${++n}`, "barangay_admin", BARANGAY_ID);
  const residentFor = async () => resident;

  const BAD_IDS = ["abc", "1.5", "-1", "0", "1e3", "99999999999", "2147483648"];
  const MISSING_ID = 2147483647; // valid int4, no such ticket

  const assert400 = (res, expected) => {
    assert.equal(res.status, 400, `status ${res.status}: ${JSON.stringify(res.body)?.slice(0, 200)}`);
    assert.equal(typeof res.body?.message, "string", `no message: ${JSON.stringify(res.body)}`);
    if (expected) assert.equal(res.body.message, expected);
  };
  const unchanged = async (ticket, fn) => {
    const before = await ticketState(ticket);
    await fn();
    assert.deepEqual(await ticketState(ticket), before, "the ticket changed");
  };

  const routes = [
    ["resident reply", residentFor, (id) => [`/api/feedbacks/${id}/reply`, { reply: "Thanks" }]],
    ["mdrrmo admin reply", freshMdrrmo, (id) => [`/api/admin/mdrrmo/feedback/${id}/reply`, { reply: "Noted", status: "Replied" }]],
    ["barangay admin reply", freshBrgy, (id) => [`/api/admin/mdrrmo/feedback/${id}/reply`, { reply: "Noted", status: "Replied" }]],
    ["mdrrmo admin close", freshMdrrmo, (id) => [`/api/admin/mdrrmo/feedback/${id}/close`, undefined]],
    ["barangay admin close", freshBrgy, (id) => [`/api/admin/mdrrmo/feedback/${id}/close`, undefined]],
  ];

  // :id
  for (const [who, makeUser, req] of routes) {
    const user = await makeUser();
    for (const bad of BAD_IDS) {
      await check(`${who}: :id '${bad}' is a 400`, async () => {
        const [path, body] = req(bad);
        assert400(await call(user, "PUT", path, body), "Invalid feedback id.");
      });
    }
    await check(`${who}: a valid id with no ticket stays a 404`, async () => {
      const [path, body] = req(MISSING_ID);
      const res = await call(user, "PUT", path, body);
      assert.equal(res.status, 404, `status ${res.status}: ${JSON.stringify(res.body)?.slice(0, 200)}`);
    });
  }

  // reply text, both reply routes
  const BAD_REPLIES = [
    ["number", 123],
    ["object", { text: "x" }],
    ["array", ["x"]],
    ["boolean", true],
    ["whitespace-only", "   \n\t "],
  ];
  const replyRoutes = [
    ["resident reply", residentFor, mdrrmoTicket, (t, reply) => [`/api/feedbacks/${t}/reply`, { reply }]],
    ["mdrrmo admin reply", freshMdrrmo, mdrrmoTicket, (t, reply) => [`/api/admin/mdrrmo/feedback/${t}/reply`, { reply, status: "Replied" }]],
    ["barangay admin reply", freshBrgy, brgyTicket, (t, reply) => [`/api/admin/mdrrmo/feedback/${t}/reply`, { reply, status: "Replied" }]],
  ];
  for (const [who, makeUser, ticket, req] of replyRoutes) {
    const user = await makeUser();
    for (const [label, reply] of BAD_REPLIES) {
      await check(`${who}: ${label} reply is a 400 and stores nothing`, () =>
        unchanged(ticket, async () => {
          const [path, body] = req(ticket, reply);
          assert400(await call(user, "PUT", path, body));
        })
      );
    }
  }

  // admin status (already limited to the two values FeedbackTicketCard/close send)
  const statusAdmin = await freshMdrrmo();
  for (const status of [undefined, "Pending", "replied", "Bogus", 1]) {
    await check(`mdrrmo admin reply: status ${JSON.stringify(status)} is a 400 and changes nothing`, () =>
      unchanged(mdrrmoTicket, async () => {
        const res = await call(statusAdmin, "PUT", `/api/admin/mdrrmo/feedback/${mdrrmoTicket}/reply`, { reply: "Noted", status });
        assert.equal(res.status, 400, `status ${res.status}: ${JSON.stringify(res.body)?.slice(0, 200)}`);
      })
    );
  }

  // what the client sends still works
  await check("resident reply: the client's payload is a 200 and is stored", async () => {
    const res = await call(resident, "PUT", `/api/feedbacks/${mdrrmoTicket}/reply`, { reply: "  Still flooded  " });
    assert.equal(res.status, 200, JSON.stringify(res.body)?.slice(0, 200));
  });
  for (const [who, admin, ticket] of [["mdrrmo admin", mdrrmo, mdrrmoTicket], ["barangay admin", brgyAdmin, brgyTicket]]) {
    await check(`${who} reply: the client's payload (status Replied) is a 200`, async () => {
      const res = await call(admin, "PUT", `/api/admin/mdrrmo/feedback/${ticket}/reply`, { reply: "Team dispatched", status: "Replied" });
      assert.equal(res.status, 200, JSON.stringify(res.body)?.slice(0, 200));
      assert.equal((await ticketState(ticket)).status, "Replied");
    });
  }
  await check("mdrrmo admin close: a real ticket id is a 200 and closes it", async () => {
    const res = await call(mdrrmo, "PUT", `/api/admin/mdrrmo/feedback/${closeTicket}/close`);
    assert.equal(res.status, 200, JSON.stringify(res.body)?.slice(0, 200));
    assert.equal((await ticketState(closeTicket)).status, "Closed");
  });

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):\n  - ${failures.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    console.log("All feedback reply input regression checks passed.");
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
