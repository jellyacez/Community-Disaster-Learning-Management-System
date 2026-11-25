/**
 * Regression test: POST /api/feedbacks checked none of its fields (audit M7, P5-06).
 *
 * recipient, type, subject and message went straight into the INSERT. A recipient outside
 * the two the form offers ("barangay", "mdrrmo") stored a ticket that no admin inbox lists
 * (getAdminFeedbacks shows MDRRMO/system admins recipient='mdrrmo' and barangay admins
 * recipient='barangay'), and `{}` or a missing field hit a NOT NULL violation, a 500.
 * Now: recipient must be "barangay" or "mdrrmo", type one of the form's options
 * ("feedback", "inquiry", "concern", "report"), subject and message non-empty strings after
 * trim; anything else is a 400 with a message and nothing is stored. Every recipient/type
 * pair the form can send, and the exact payload the offline queue replays (with user_id),
 * are still accepted and land in the inbox of the admin who should see them.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server. Users and sessions are seeded directly
 * into the database and removed by exact ID in `finally`. Refuses a non-loopback database.
 *
 * Run from the repo root:  node server/tests/feedback-fields.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "feedback-fields-regression/1.0";
const RUN = `regress_ff_${crypto.randomBytes(4).toString("hex")}`;
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

async function call(user, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const countFeedbacks = async (userId) =>
  (await pool.query("SELECT COUNT(*)::int AS n FROM feedbacks WHERE user_id = $1", [userId])).rows[0].n;

// Ids of this run's tickets in an admin's inbox (searched by the run tag in the subject)
async function inboxIds(admin) {
  const res = await call(admin, "GET", `/api/admin/mdrrmo/feedback?limit=50&search=${RUN}`);
  assert.equal(res.status, 200, `inbox status ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body.data.map((t) => t.id);
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
  const base = { recipient: "mdrrmo", type: "inquiry", subject: `${RUN} Flood`, message: "Water rising" };

  // A refused submission: 400, a message the client toasts and the sync queue reads, nothing stored
  const rejects = (name, body, expectedMessage) =>
    check(name, async () => {
      const before = await countFeedbacks(resident.id);
      const res = await call(resident, "POST", "/api/feedbacks", body);
      const stored = await countFeedbacks(resident.id);
      if (res.status === 201) {
        // Repro detail: is the stored ticket in any admin inbox?
        const seenBy = [];
        if ((await inboxIds(mdrrmo)).includes(res.body.data.id)) seenBy.push("mdrrmo_admin");
        if ((await inboxIds(brgyAdmin)).includes(res.body.data.id)) seenBy.push("barangay_admin");
        console.log(
          `    stored ticket ${res.body.data.id} recipient=${JSON.stringify(res.body.data.recipient)} visible to: ${seenBy.join(", ") || "no admin"}`
        );
      }
      assert.equal(res.status, 400, `status ${res.status}: ${JSON.stringify(res.body)?.slice(0, 160)}`);
      assert.equal(typeof res.body.message, "string", `no message: ${JSON.stringify(res.body)}`);
      if (expectedMessage) assert.equal(res.body.message, expectedMessage);
      assert.equal(stored, before, "a ticket was stored");
    });

  // Missing fields (audit: {} and {recipient:"mdrrmo"} were NOT NULL 500s)
  await rejects("{} is a 400, not a NOT NULL 500", {});
  await rejects("only a recipient is a 400, not a 500", { recipient: "mdrrmo" });
  for (const field of ["recipient", "type", "subject", "message"]) {
    const rest = { ...base };
    delete rest[field];
    await rejects(`missing ${field} is a 400`, rest);
  }

  // Values no admin inbox shows, or the form never offers
  await rejects("recipient 'nobody' is a 400 (the ticket no admin sees)", { ...base, recipient: "nobody" },
    "Recipient must be barangay or mdrrmo.");
  await rejects("recipient 'MDRRMO' (wrong case, in no inbox query) is a 400", { ...base, recipient: "MDRRMO" });
  await rejects("type 'x' is a 400", { ...base, type: "x" }, "Type must be feedback, inquiry, concern or report.");
  await rejects("type 'Inquiry' (not one of the form's values) is a 400", { ...base, type: "Inquiry" });

  // Blank text
  await rejects("empty subject is a 400", { ...base, subject: "" }, "Subject is required.");
  await rejects("whitespace-only subject is a 400", { ...base, subject: "   \n\t" }, "Subject is required.");
  await rejects("whitespace-only message is a 400", { ...base, message: "  \n " }, "Message is required.");

  // Wrong JSON types
  await rejects("numeric subject is a 400", { ...base, subject: 123 }, "Subject is required.");
  await rejects("array message is a 400", { ...base, message: ["Water rising"] }, "Message is required.");
  await rejects("array recipient is a 400", { ...base, recipient: ["mdrrmo"] });
  await rejects("object type is a 400", { ...base, type: { value: "inquiry" } });
  await rejects("null recipient is a 400", { ...base, recipient: null });

  // Everything the form can send still works and reaches the right inbox
  await check("every recipient x type pair the form offers is a 201 and reaches the scoped admin inbox", async () => {
    const ids = { mdrrmo: [], barangay: [] };
    for (const recipient of ["barangay", "mdrrmo"]) {
      for (const type of ["feedback", "inquiry", "concern", "report"]) {
        const res = await call(resident, "POST", "/api/feedbacks", {
          recipient,
          type,
          subject: `${RUN} ${recipient} ${type}`,
          message: "Form message",
        });
        assert.equal(res.status, 201, `${recipient}/${type}: ${res.status} ${JSON.stringify(res.body)}`);
        assert.equal(res.body.data.recipient, recipient);
        assert.equal(res.body.data.type, type);
        ids[recipient].push(res.body.data.id);
      }
    }
    const mdrrmoInbox = await inboxIds(mdrrmo);
    const brgyInbox = await inboxIds(brgyAdmin);
    for (const id of ids.mdrrmo) assert.ok(mdrrmoInbox.includes(id), `mdrrmo ticket ${id} missing from MDRRMO inbox`);
    for (const id of ids.barangay) assert.ok(brgyInbox.includes(id), `barangay ticket ${id} missing from barangay inbox`);
  });

  await check("the offline queue's replay payload (form fields + user_id, padded text) is a 201", async () => {
    const res = await call(resident, "POST", "/api/feedbacks", {
      recipient: "barangay",
      type: "feedback",
      subject: `  ${RUN} queued  `,
      message: " Queued while offline ",
      user_id: resident.id,
    });
    assert.equal(res.status, 201, `${res.status} ${JSON.stringify(res.body)}`);
  });

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):\n  - ${failures.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    console.log("All feedback field regression checks passed.");
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
