/**
 * Regression test (M2 leftovers): module create/update fields that reached the database unchecked
 * and came back as a 500:
 *   - a level or step entry that isn't an object (null threw in the validator)
 *   - levelOrder / stepOrder missing, non-integer or repeated (NOT NULL integer columns, UNIQUE per parent)
 *   - an option's sequence_order that isn't a whole number (int[] cast)
 *   - is_locked_by_default / is_final_assessment that aren't booleans
 *   - a question entry that isn't an object, or a question with no questionText in a non-graded step
 *     (questions.question_text NOT NULL; only graded steps checked it)
 * Each must be a 400 with no module row, on create and on update (where the module stays as it was).
 * A well-formed module with all of those fields set still saves (201).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server; fixtures are seeded from server/.env and
 * removed by exact id. Refuses to run unless the database is on loopback, and refuses LMS_db.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> TEST_BASE_URL=http://localhost:<port> node server/tests/module-structure-entries.regression.cjs
 */
const crypto = require("crypto");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "module-structure-entries-regression/1.0";
const RUN = `regress_mse_${crypto.randomBytes(4).toString("hex")}`;
const created = { userIds: [] };
let passed = 0;
let failed = 0;

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

async function createUser(label, role) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@example.invalid`, role]
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
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// A well-formed module the builder could send: every field this test bends is present and valid
function payload(label) {
  return {
    moduleName: `${RUN} ${label}`,
    moduleCategory: "General",
    description: "<p>Structure entries regression fixture</p>",
    level: "Beginner",
    duration: "5 mins",
    status: "draft",
    levels: [
      {
        levelOrder: 1,
        levelTitle: "Level 1",
        is_locked_by_default: false,
        steps: [
          { stepOrder: 1, stepTitle: "Read", stepType: "text", is_final_assessment: false },
          {
            stepOrder: 2,
            stepTitle: "Order the steps",
            stepType: "action_sequence",
            is_final_assessment: true,
            quizQuestions: [
              {
                questionText: "Put these in order",
                options: [
                  { text: "First", isCorrect: true, sequence_order: 1 },
                  { text: "Second", isCorrect: true, sequence_order: 2 },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

const level0 = (p) => p.levels[0];
const CASES = [
  ["a level entry that is null", (p) => { p.levels = [null]; }],
  ["a level entry that is a string", (p) => { p.levels = ["Level 1"]; }],
  ["a step entry that is null", (p) => { level0(p).steps = [null]; }],
  ["a step entry that is a number", (p) => { level0(p).steps = [42]; }],
  ["levelOrder missing", (p) => { delete level0(p).levelOrder; }],
  ["levelOrder 'abc'", (p) => { level0(p).levelOrder = "abc"; }],
  ["levelOrder 1.5", (p) => { level0(p).levelOrder = 1.5; }],
  ["two levels with the same levelOrder", (p) => { p.levels.push({ ...structuredClone(level0(p)), levelTitle: "Level 2" }); }],
  ["stepOrder missing", (p) => { delete level0(p).steps[0].stepOrder; }],
  ["stepOrder 'abc'", (p) => { level0(p).steps[0].stepOrder = "abc"; }],
  ["stepOrder 2.5", (p) => { level0(p).steps[0].stepOrder = 2.5; }],
  ["two steps with the same stepOrder", (p) => { level0(p).steps[1].stepOrder = 1; }],
  ["option sequence_order 'abc'", (p) => { level0(p).steps[1].quizQuestions[0].options[0].sequence_order = "abc"; }],
  ["option sequence_order 1.5", (p) => { level0(p).steps[1].quizQuestions[0].options[0].sequence_order = 1.5; }],
  ["is_locked_by_default 'abc'", (p) => { level0(p).is_locked_by_default = "abc"; }],
  ["is_locked_by_default {}", (p) => { level0(p).is_locked_by_default = {}; }],
  ["is_final_assessment 'abc'", (p) => { level0(p).steps[1].is_final_assessment = "abc"; }],
  ["is_final_assessment {}", (p) => { level0(p).steps[1].is_final_assessment = {}; }],
  ["a question entry that is null (graded step)", (p) => { level0(p).steps[1].quizQuestions = [null]; }],
  ["a question entry that is null (text step)", (p) => { level0(p).steps[0].quizQuestions = [null]; }],
  ["a question with no questionText in a text step", (p) => {
    level0(p).steps[0].quizQuestions = [{ options: [{ text: "A", isCorrect: true }] }];
  }],
];

const rowsNamed = async (label) =>
  (await pool.query("SELECT mod_id FROM module_data WHERE modname = $1", [`${RUN} ${label}`])).rows;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`not ok - ${name}\n  ${err.message}`);
  }
}

async function main() {
  await assertScratchDatabase();
  const author = await createUser("author", "mdrrmo_admin");

  await test("a well-formed module with every bent field set saves (201)", async () => {
    const res = await call(author, "POST", "/api/modules", payload("baseline"));
    if (res.status !== 201) throw new Error(`status ${res.status} ${JSON.stringify(res.body)}`);
    if ((await rowsNamed("baseline")).length !== 1) throw new Error("no row stored");
  });

  for (const [i, [name, bend]] of CASES.entries()) {
    await test(`create: ${name} -> 400, no row`, async () => {
      const body = payload(`create ${i}`);
      bend(body);
      const res = await call(author, "POST", "/api/modules", body);
      if (res.status !== 400) throw new Error(`status ${res.status} ${JSON.stringify(res.body)}`);
      if ((await rowsNamed(`create ${i}`)).length) throw new Error("a module row was stored");
    });
  }

  // The update path rebuilds levels and steps in its own transaction; it must refuse the same input
  await call(author, "POST", "/api/modules", payload("to update"));
  const [target] = await rowsNamed("to update");
  const shape = async () =>
    JSON.stringify((await pool.query(
      `SELECT l.level_order, l.level_title, s.step_order, s.step_title FROM levels l JOIN module_steps s ON s.level_id = l.level_id
       WHERE l.mod_id = $1 ORDER BY l.level_order, s.step_order`, [target.mod_id])).rows);
  const before = target ? await shape() : null;
  for (const [i, [name, bend]] of CASES.entries()) {
    await test(`update: ${name} -> 400, module unchanged`, async () => {
      if (!target) throw new Error("fixture module was not created");
      const body = payload("to update");
      bend(body);
      const res = await call(author, "PUT", `/api/modules/${target.mod_id}`, body);
      if (res.status !== 400) throw new Error(`status ${res.status} ${JSON.stringify(res.body)} (case ${i})`);
      if ((await shape()) !== before) throw new Error("levels or steps changed");
    });
  }
}

async function cleanup() {
  const { userIds } = created;
  const modIds = (await pool.query("SELECT mod_id FROM module_data WHERE modname LIKE $1", [`${RUN} %`])).rows.map((r) => r.mod_id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM module_activity WHERE mod_id = ANY($1)", [modIds]);
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
}

main()
  .catch((err) => {
    failed++;
    console.error("FAIL:", err.message);
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("CLEANUP FAILED:", err.message);
      failed++;
    }
    await pool.end();
    console.log(`${passed} passed, ${failed} failed`);
    process.exit(failed ? 1 : 0);
  });
