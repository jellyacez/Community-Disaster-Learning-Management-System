/**
 * Regression test: four status transitions that skipped their guards.
 *
 *   1. Module create/update took status from the request body, so an author without
 *      approve_modules could publish directly, or clone a published module as "published"
 *      and leave two published versions.
 *   2. Completing a module renewed an expired or expiring certificate even when it was
 *      revoked, flipping it back to active with the revocation fields still set.
 *   3. Editing a user's name/email wrote archived = NULL (the form doesn't send it), which
 *      silently restored an archived account.
 *   4. A resident's follow-up on a Replied ticket left it Replied, so it never returned to
 *      the Pending queue; an admin reply could also set any status.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server (2 calls the service in-process) and
 * seeds fixtures directly into the database from server/.env, removing them by exact ID in
 * `finally`. Refuses to run unless the database is on loopback.
 *
 * Run from the repo root:  node server/tests/state-transitions.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "state-transitions-regression/1.0";
const RUN = `regress_st_${crypto.randomBytes(4).toString("hex")}`;

const created = { userIds: [], modIds: [], feedbackIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role, { archived = false } = {}) {
  const id = `${RUN}_${label}`;
  // Admin roles require MFA; the flag stands in for an enrolled second factor
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, $5, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, role, archived]
  );
  created.userIds.push(id);
  return id;
}

async function sessionCookie(userId) {
  const ctx = await auth.$context;
  const token = crypto.randomBytes(24).toString("hex");
  await pool.query(
    `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
     VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW(), NOW(), '127.0.0.1', $3, $4)`,
    [`${userId}_session_${crypto.randomBytes(3).toString("hex")}`, token, UA, userId]
  );
  const signature = crypto.createHmac("sha256", ctx.secret).update(token).digest("base64");
  return `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}`;
}

async function call(cookie, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: cookie },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

function modulePayload(label, status) {
  return {
    moduleName: `${RUN} ${label}`,
    moduleCategory: "General",
    description: "<p>State transition regression fixture</p>",
    level: "Beginner",
    duration: "5 mins",
    status,
    levels: [{ levelOrder: 1, levelTitle: "Level 1", steps: [{ stepOrder: 1, stepTitle: "Read", stepType: "learning" }] }],
  };
}

async function modulesByName(label) {
  const { rows } = await pool.query("SELECT mod_id, status FROM module_data WHERE modname = $1", [`${RUN} ${label}`]);
  created.modIds.push(...rows.map((r) => r.mod_id));
  return rows;
}

async function seedModule(label, status) {
  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status)
     VALUES ($1, 'General', 'State transition regression fixture', 'Beginner', '5 mins', $2) RETURNING mod_id`,
    [`${RUN} ${label}`, status]
  );
  created.modIds.push(rows[0].mod_id);
  return rows[0].mod_id;
}

async function cleanup() {
  const { userIds, modIds, feedbackIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM feedback_messages WHERE feedback_id = ANY($1)", [feedbackIds]);
    await client.query("DELETE FROM feedbacks WHERE id = ANY($1)", [feedbackIds]);
    await client.query("DELETE FROM certificates WHERE user_id = ANY($1) OR module_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM user_step_progress WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM module_activity WHERE user_id = ANY($1) OR mod_id = ANY($2)", [userIds, modIds]);
    await client.query("UPDATE module_data SET parent_mod_id = NULL WHERE mod_id = ANY($1)", [modIds]);
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1)", [modIds]);
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
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2) OR modname LIKE $4) AS modules,
       (SELECT COUNT(*)::int FROM feedbacks WHERE id = ANY($3)) AS feedbacks`,
    [userIds, modIds, feedbackIds, `${RUN}%`]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  // Keeps going after a failure, so one run reports each of the four fixes
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

  // 1. module status from the request body
  const author = await createUser("author", "mdrrmo_admin");
  const authorCookie = await sessionCookie(author);

  await check("an author can't create a module as published", async () => {
    const res = await call(authorCookie, "POST", "/api/modules", modulePayload("direct publish", "published"));
    const rows = await modulesByName("direct publish");
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal(rows.length, 0);
  });

  await check("an author can still create a draft", async () => {
    const res = await call(authorCookie, "POST", "/api/modules", modulePayload("plain draft", "draft"));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const rows = await modulesByName("plain draft");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "draft");
  });

  await check("editing a published module can't clone it as published", async () => {
    const published = await seedModule("live", "published");
    const res = await call(authorCookie, "PUT", `/api/modules/${published}`, modulePayload("live clone", "published"));
    const rows = await modulesByName("live clone");
    assert.equal(res.status, 400, JSON.stringify(res.body));
    assert.equal(rows.length, 0);
  });

  // 2. revoked certificate renewal
  await check("completing a module doesn't renew a revoked certificate", async () => {
    const ModuleProgressService = require("../services/modules/ModuleProgressService");
    const learner = await createUser("learner", "resident");
    const modId = await seedModule("cert", "published");
    const { rows: lvl } = await pool.query(
      `INSERT INTO levels (mod_id, level_order, level_title) VALUES ($1, 1, 'Level 1') RETURNING level_id`,
      [modId]
    );
    const { rows: step } = await pool.query(
      `INSERT INTO module_steps (level_id, step_order, step_title, step_type) VALUES ($1, 1, 'Read', 'learning') RETURNING step_id`,
      [lvl[0].level_id]
    );
    const { rows: act } = await pool.query(
      `INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, 'Completed', 100) RETURNING modact_id`,
      [learner, modId]
    );
    // Revoked, and its original expiry has passed: the renewal branch used to reactivate this
    await pool.query(
      `INSERT INTO certificates (user_id, modact_id, cert_rec, module_id, completion_date, verification_token,
                                 expires_at, status, revocation_reason, revoked_at)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 years', $5, NOW() - INTERVAL '1 day', 'revoked', 'regression', NOW())`,
      [learner, act[0].modact_id, `${RUN}-CERT`, modId, crypto.randomUUID()]
    );

    await ModuleProgressService.completeModuleStep(learner, modId, step[0].step_id, null);

    const { rows } = await pool.query(
      "SELECT status, revoked_at FROM certificates WHERE user_id = $1 AND module_id = $2",
      [learner, modId]
    );
    assert.equal(rows[0].status, "revoked");
    assert.ok(rows[0].revoked_at, "revocation fields were cleared");
  });

  // 3. editing details of an archived user
  const sysAdmin = await createUser("sysadmin", "system_admin");
  const sysCookie = await sessionCookie(sysAdmin);

  await check("editing an archived user's name keeps them archived", async () => {
    const target = await createUser("archived", "resident", { archived: true });
    const res = await call(sysCookie, "PUT", `/api/admin/users/${target}`, {
      name: "Renamed resident",
      email: `${target}@regression.invalid`,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { rows } = await pool.query(`SELECT name, archived FROM "user" WHERE id = $1`, [target]);
    assert.equal(rows[0].name, "Renamed resident");
    assert.equal(rows[0].archived, true);
  });

  await check("editing an active user's name keeps archived = false, not NULL", async () => {
    const target = await createUser("active", "resident");
    const res = await call(sysCookie, "PUT", `/api/admin/users/${target}`, {
      name: "Renamed active",
      email: `${target}@regression.invalid`,
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const { rows } = await pool.query(`SELECT archived FROM "user" WHERE id = $1`, [target]);
    assert.equal(rows[0].archived, false);
  });

  // 4. feedback status
  const resident = await createUser("resident", "resident");
  const residentCookie = await sessionCookie(resident);
  const { rows: fb } = await pool.query(
    `INSERT INTO feedbacks (user_id, recipient, type, subject, message, status)
     VALUES ($1, 'mdrrmo', 'General', $2, 'Question', 'Replied') RETURNING id`,
    [resident, `${RUN} ticket`]
  );
  const ticket = fb[0].id;
  created.feedbackIds.push(ticket);

  await check("a resident follow-up returns a Replied ticket to Pending", async () => {
    const res = await call(residentCookie, "PUT", `/api/feedbacks/${ticket}/reply`, { reply: "One more question" });
    assert.ok(res.status < 300, JSON.stringify(res.body));
    const { rows } = await pool.query("SELECT status FROM feedbacks WHERE id = $1", [ticket]);
    assert.equal(rows[0].status, "Pending");
  });

  await check("an admin reply can't set the ticket to Pending", async () => {
    await pool.query("UPDATE feedbacks SET status = 'Replied' WHERE id = $1", [ticket]);
    const res = await call(sysCookie, "PUT", `/api/admin/mdrrmo/feedback/${ticket}/reply`, {
      reply: "Answer",
      status: "Pending",
    });
    assert.equal(res.status, 400, JSON.stringify(res.body));
    const { rows } = await pool.query("SELECT status FROM feedbacks WHERE id = $1", [ticket]);
    assert.equal(rows[0].status, "Replied");
  });

  if (failures.length) throw new Error(`${failures.length} check(s) failed`);
  console.log("All state-transition regression checks passed.");
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
