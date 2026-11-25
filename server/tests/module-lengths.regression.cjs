/**
 * Regression test: module create/update had no length limits or count caps (validation audit M3).
 *
 *   - modname, description, video_url, image_url (module_data), media_url (module_steps) and
 *     questions.image_url are varchar(500); level_title and step_title varchar(255); modcat,
 *     level and duration varchar(50). Nothing checked their length, so one character over
 *     raised "value too long" inside the transaction: a 500. modcat also has a CHECK
 *     (valid_modcat) allowing only the builder's five categories; any other was a 500 too.
 *   - description is stored after cleanRichText, which can lengthen it (a bare "&" becomes
 *     "&amp;"), so 500 typed characters could still overflow.
 *   - levels per module, steps per level, questions per step and options per question were
 *     unbounded (only the 800 KB body limit stopped them).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts each over-limit case returns
 * 400 and writes nothing (POST /api/modules for every case; two on PUT of a draft and of a
 * published module, which share the validator), and that values exactly at each column size
 * (counted in characters, as Postgres does, so emoji count once) and modules at every count
 * cap still save with their values intact.
 *
 * Fixtures are seeded directly into the database from server/.env and removed by exact ID
 * (and by the run's name prefix for API-created rows) in `finally`. Loopback databases only.
 *
 * Run from the repo root:  node server/tests/module-lengths.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "module-lengths-regression/1.0";
const RUN = `regress_mlen_${crypto.randomBytes(4).toString("hex")}`;

const created = { userIds: [], modIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role) {
  const id = `${RUN}_${label}`;
  // Admin roles require MFA; the flag stands in for an enrolled second factor
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, role]
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

async function call(user, method, urlPath, body) {
  const res = await fetch(`${BASE_URL}${urlPath}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// A string of exactly n characters (code points) starting with prefix
const pad = (prefix, n, fill = "x") => prefix + fill.repeat(n - [...prefix].length);
// An http URL of exactly n characters ending in suffix
const url = (n, suffix = ".jpg") => pad("https://cdn.example.org/", n - suffix.length, "a") + suffix;

const opt = (text, isCorrect) => ({ text, isCorrect, rationale: "" });
const textStep = (extra = {}) => ({ stepTitle: "Read", stepContent: "<p>x</p>", mediaUrl: "", stepType: "text", quizQuestions: [], ...extra });
const question = (extra = {}) => ({ questionText: "Pick one", imageURL: "", options: [opt("A", true), opt("B", false)], ...extra });
const quizStep = (questions = [question()]) => ({ stepTitle: "Quiz", stepContent: "", mediaUrl: "", stepType: "quiz", quizQuestions: questions });

function modulePayload(name, { levels, steps, level = {}, top = {} } = {}) {
  const build = (lvl, i) => ({
    levelOrder: i + 1,
    levelTitle: `Level ${i + 1}`,
    levelDescription: "",
    passing_threshold: 80,
    is_locked_by_default: true,
    cover_image: null,
    coverImage: null,
    ...lvl,
    steps: (lvl.steps || steps || [textStep(), quizStep()]).map((s, j) => ({ stepOrder: j + 1, is_final_assessment: false, ...s })),
  });
  return {
    moduleName: `${RUN} ${name}`,
    moduleCategory: "General",
    description: "<p>Module length regression fixture</p>",
    level: "Level 1",
    duration: "15 mins",
    image_url: "",
    video_url: "",
    status: "draft",
    ...top,
    levels: (levels || [level]).map(build),
  };
}

async function seedModule(label, status, authorId) {
  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status, author_id)
     VALUES ($1, 'General', 'Module length regression fixture', 'Level 1', '15 mins', $2, $3) RETURNING mod_id`,
    [`${RUN} ${label}`, status, authorId]
  );
  created.modIds.push(rows[0].mod_id);
  return rows[0].mod_id;
}

// Matches the over-long names too, which start with the case name
async function modulesStartingWith(label) {
  const { rows } = await pool.query("SELECT mod_id FROM module_data WHERE starts_with(modname, $1)", [`${RUN} ${label}`]);
  created.modIds.push(...rows.map((r) => r.mod_id));
  return rows;
}

async function cleanup() {
  const { userIds } = created;
  const { rows: named } = await pool.query("SELECT mod_id FROM module_data WHERE starts_with(modname, $1)", [RUN]);
  const modIds = [...new Set([...created.modIds, ...named.map((r) => r.mod_id)])];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE module_data SET parent_mod_id = NULL WHERE mod_id = ANY($1)", [modIds]);
    // levels, steps, questions and choices cascade from module_data
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
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2) OR starts_with(modname, $3)) AS modules`,
    [userIds, modIds, RUN]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

// Each case is a modulePayload option set (given its own name) the server must refuse
const BAD = {
  "moduleName 501": (name) => ({ top: { moduleName: pad(`${RUN} ${name} `, 501) } }),
  // valid_modcat allows only the five builder categories, so length alone is not the limit
  'moduleCategory "Typhoon"': () => ({ top: { moduleCategory: "Typhoon" } }),
  "moduleCategory 51": () => ({ top: { moduleCategory: pad("", 51) } }),
  "level 51": () => ({ top: { level: pad("", 51) } }),
  "duration 51": () => ({ top: { duration: pad("1", 46, "0") + " mins" } }),
  "description 501": () => ({ top: { description: `<p>${pad("", 494)}</p>` } }),
  // 500 as sent, 504 once cleanRichText turns the "&" into "&amp;"
  'description 500 that cleans to 504 ("&")': () => ({ top: { description: `<p>a & ${pad("", 489)}</p>` } }),
  "image_url 501": () => ({ top: { image_url: url(501) } }),
  "video_url 501": () => ({ top: { video_url: url(501, ".mp4") } }),
  "levelTitle 256": () => ({ level: { levelTitle: pad("", 256) } }),
  "stepTitle 256": () => ({ steps: [textStep({ stepTitle: pad("", 256) })] }),
  "mediaUrl 501": () => ({ steps: [textStep({ stepType: "video", stepContent: "", mediaUrl: url(501, ".mp4") })] }),
  "question imageURL 501": () => ({ steps: [quizStep([question({ imageURL: url(501) })])] }),
  "51 levels": () => ({ levels: range(51, () => ({ steps: [textStep()] })) }),
  "101 steps in a level": () => ({ steps: range(101, () => textStep()) }),
  "101 questions in a step": () => ({ steps: [quizStep(range(101, () => question()))] }),
  "31 options in a question": () => ({ steps: [quizStep([question({ options: range(31, (i) => opt(`O${i}`, i === 0)) })])] }),
};
const PUT_SAMPLE = ["moduleName 501", "stepTitle 256"];

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

  const author = await createUser("author", "mdrrmo_admin");

  const routes = [
    {
      label: "POST /api/modules",
      cases: Object.keys(BAD),
      send: async (name, opts) => {
        const res = await call(author, "POST", "/api/modules", modulePayload(name, opts));
        return { res, written: (await modulesStartingWith(name)).length > 0 };
      },
    },
    {
      label: "PUT /api/modules/:id (draft)",
      cases: PUT_SAMPLE,
      send: async (name, opts) => {
        const draft = await seedModule(`target ${name}`, "draft", author.id);
        const res = await call(author, "PUT", `/api/modules/${draft}`, modulePayload(name, opts));
        const { rows } = await pool.query("SELECT modname FROM module_data WHERE mod_id = $1", [draft]);
        return { res, written: rows[0].modname !== `${RUN} target ${name}` };
      },
    },
    {
      label: "PUT /api/modules/:id (published -> revision)",
      cases: PUT_SAMPLE,
      send: async (name, opts) => {
        const published = await seedModule(`target ${name}`, "published", author.id);
        const res = await call(author, "PUT", `/api/modules/${published}`, modulePayload(name, opts));
        return { res, written: (await modulesStartingWith(name)).length > 0 };
      },
    },
  ];

  for (const route of routes) {
    for (const name of route.cases) {
      await check(`${route.label} refuses ${name} with a 400 and writes nothing`, async () => {
        const caseName = `bad ${name}`;
        const { res, written } = await route.send(caseName, BAD[name](caseName));
        assert.ok(res.status === 400 && !written, `${res.status}${written ? " (written)" : ""} ${JSON.stringify(res.body)?.slice(0, 200)}`);
      });
    }
  }

  await check("POST /api/modules saves every field at its column size, emoji counted once", async () => {
    const moduleName = pad(`${RUN} at limit `, 500, "\u{1F600}");
    const payload = modulePayload("at limit", {
      top: {
        moduleName,
        moduleCategory: "Fundamentals",
        level: pad("", 50),
        duration: pad("1", 45, "0") + " mins",
        description: `<p>${pad("", 493)}</p>`,
        image_url: url(500),
        video_url: url(500, ".mp4"),
      },
      level: {
        levelTitle: pad("", 255, "\u{1F600}"),
        steps: [
          textStep({ stepTitle: pad("", 255), stepType: "video", stepContent: "", mediaUrl: url(500, ".mp4") }),
          quizStep([question({ imageURL: url(500) })]),
        ],
      },
    });
    const res = await call(author, "POST", "/api/modules", payload);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const modId = res.body.data.mod_id;
    created.modIds.push(modId);
    const { rows } = await pool.query(
      `SELECT char_length(md.modname) AS modname, md.modcat, char_length(md.level) AS level,
              char_length(md.duration) AS duration, char_length(md.description) AS description,
              char_length(md.image_url) AS image_url, char_length(md.video_url) AS video_url,
              char_length(l.level_title) AS level_title, char_length(ms.step_title) AS step_title,
              char_length(ms.media_url) AS media_url, char_length(q.image_url) AS q_image_url
       FROM module_data md JOIN levels l ON l.mod_id = md.mod_id
       JOIN module_steps ms ON ms.level_id = l.level_id AND ms.step_order = 1
       JOIN module_steps qs ON qs.level_id = l.level_id AND qs.step_order = 2
       JOIN questions q ON q.step_id = qs.step_id
       WHERE md.mod_id = $1`,
      [modId]
    );
    assert.deepEqual(rows[0], {
      modname: 500, modcat: "Fundamentals", level: 50, duration: 50, description: 500, image_url: 500, video_url: 500,
      level_title: 255, step_title: 255, media_url: 500, q_image_url: 500,
    });
  });

  await check("POST /api/modules saves 50 levels, 100 steps in a level, 100 questions in a step and 30 options", async () => {
    const levels = range(50, (i) =>
      i === 0
        ? { steps: [...range(99, () => textStep()), quizStep(range(100, (k) => question({ options: range(k === 0 ? 30 : 2, (o) => opt(`O${o}`, o === 0)) })))] }
        : { steps: [textStep()] }
    );
    const res = await call(author, "POST", "/api/modules", modulePayload("at caps", { levels }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const modId = res.body.data.mod_id;
    created.modIds.push(modId);
    const { rows } = await pool.query(
      `SELECT (SELECT COUNT(*)::int FROM levels WHERE mod_id = $1) AS levels,
              (SELECT MAX(n)::int FROM (SELECT COUNT(*) AS n FROM module_steps ms JOIN levels l ON l.level_id = ms.level_id WHERE l.mod_id = $1 GROUP BY ms.level_id) s) AS steps,
              (SELECT COUNT(*)::int FROM questions WHERE mod_id = $1) AS questions,
              (SELECT MAX(n)::int FROM (SELECT COUNT(*) AS n FROM choices c JOIN questions q ON q.question_id = c.question_id WHERE q.mod_id = $1 GROUP BY c.question_id) c) AS options`,
      [modId]
    );
    assert.deepEqual(rows[0], { levels: 50, steps: 100, questions: 100, options: 30 });
  });

  return failures;
}

main()
  .then(async (failures) => {
    await cleanup();
    if (failures.length) {
      console.log(`\n${failures.length} check(s) failed`);
      process.exitCode = 1;
    } else {
      console.log("\nall checks passed");
    }
  })
  .catch(async (err) => {
    console.error(err);
    process.exitCode = 1;
    try {
      await cleanup();
    } catch (cleanupErr) {
      console.error("cleanup failed:", cleanupErr);
    }
  })
  .finally(() => pool.end());
