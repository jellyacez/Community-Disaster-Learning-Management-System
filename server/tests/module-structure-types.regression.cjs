/**
 * Regression test: module create/update let malformed structure through (validation audit M2).
 *
 *   - passing_threshold had no type or 0-100 bound: 85.5 reached the integer column (a 500),
 *     150 or -5 were stored (no learner can pass, or everyone does), "abc" or true slipped
 *     through Number(x) || 80
 *   - stepType only had to be a non-empty string; module_steps.step_type has no CHECK
 *   - question options only had to be a non-empty array: a single-answer question with no
 *     correct option was stored (unanswerable), and isCorrect went straight into a boolean[]
 *     cast (missing -> NOT NULL 500, "yes" -> cast 500, 1 -> stored as true); an option with
 *     no text hit choices.choice_text NOT NULL (a 500)
 *   - validateUrl skipped non-strings, so numbers/objects/arrays in image_url, video_url,
 *     mediaUrl, imageURL and cover_image/coverImage were stored (M1 left these open)
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that each of those returns
 * 400 and writes nothing (POST /api/modules for every case; a sample on PUT of a draft and of a
 * published module, which share the validator), and that what the builder sends still saves:
 * numeric-string/blank thresholds, every step type the builder produces (text, video, pdf,
 * quiz, situational, and legacy priority_action/hazard_identification/action_sequence step
 * types it re-saves unchanged), a hazard scenario with no hazard marked required, and a module
 * loaded through GET /edit-details, hydrated by the builder's hydrateFlowStep and saved back
 * unchanged.
 *
 * Fixtures are seeded directly into the database from server/.env and removed by exact ID
 * (and by the run's name prefix for API-created rows) in `finally`. Loopback databases only.
 *
 * Run from the repo root:  node server/tests/module-structure-types.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const path = require("path");
const { pathToFileURL } = require("url");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "module-structure-types-regression/1.0";
const RUN = `regress_mst_${crypto.randomBytes(4).toString("hex")}`;

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

const opt = (text, isCorrect, extra = {}) => ({ text, isCorrect, rationale: `why ${text}`, ...extra });
const textStep = (extra = {}) => ({ stepTitle: "Read", stepContent: "<p>x</p>", mediaUrl: "", stepType: "text", quizQuestions: [], ...extra });
const quizStep = (options, qExtra = {}) => ({
  stepTitle: "Quiz",
  stepContent: "",
  mediaUrl: "",
  stepType: "quiz",
  quizQuestions: [{ questionText: "Pick one", imageURL: "", options, ...qExtra }],
});
const situationalStep = (question, stepType = "situational") => ({
  stepTitle: "Scenario",
  stepContent: "",
  mediaUrl: "",
  stepType,
  quizQuestions: [{ questionText: "What now?", imageURL: "", rationale: null, ...question }],
});

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
    steps: (lvl.steps || steps || [textStep(), quizStep([opt("A", true), opt("B", false)])]).map((s, j) => ({
      stepOrder: j + 1,
      is_final_assessment: false,
      ...s,
    })),
  });
  return {
    moduleName: `${RUN} ${name}`,
    moduleCategory: "General",
    description: "<p>Module structure regression fixture</p>",
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
     VALUES ($1, 'General', 'Module structure regression fixture', 'Level 1', '15 mins', $2, $3) RETURNING mod_id`,
    [`${RUN} ${label}`, status, authorId]
  );
  created.modIds.push(rows[0].mod_id);
  return rows[0].mod_id;
}

async function modulesNamed(label) {
  const { rows } = await pool.query("SELECT mod_id FROM module_data WHERE modname = $1", [`${RUN} ${label}`]);
  created.modIds.push(...rows.map((r) => r.mod_id));
  return rows;
}

async function storedStructure(modId) {
  const { rows: levels } = await pool.query(
    "SELECT level_order, passing_threshold FROM levels WHERE mod_id = $1 ORDER BY level_order",
    [modId]
  );
  const { rows: steps } = await pool.query(
    `SELECT ms.step_type,
            COALESCE((SELECT json_agg(json_build_object('it', q.interaction_type,
                        'choices', (SELECT json_agg(json_build_object('t', c.choice_text, 'c', c.is_correct, 's', c.sequence_order) ORDER BY c.choice_id)
                                    FROM choices c WHERE c.question_id = q.question_id)) ORDER BY q.question_id)
                      FROM questions q WHERE q.step_id = ms.step_id), '[]') AS questions
     FROM module_steps ms JOIN levels l ON l.level_id = ms.level_id
     WHERE l.mod_id = $1 ORDER BY l.level_order, ms.step_order`,
    [modId]
  );
  return { levels, steps };
}

async function cleanup() {
  const { userIds } = created;
  const { rows: named } = await pool.query("SELECT mod_id FROM module_data WHERE modname LIKE $1", [`${RUN}%`]);
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
       (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($2) OR modname LIKE $3) AS modules`,
    [userIds, modIds, `${RUN}%`]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
}

// Each case is a modulePayload option set the server must refuse
const BAD = {
  "threshold 85.5": { level: { passing_threshold: 85.5 } },
  "threshold 150": { level: { passing_threshold: 150 } },
  "threshold -5": { level: { passing_threshold: -5 } },
  'threshold "abc"': { level: { passing_threshold: "abc" } },
  "threshold true": { level: { passing_threshold: true } },
  "threshold {}": { level: { passing_threshold: {} } },
  'stepType "bogus"': { steps: [textStep({ stepType: "bogus" })] },
  'stepType "learning"': { steps: [textStep({ stepType: "learning" })] },
  'stepType "Quiz"': { steps: [quizStep([opt("A", true)]), textStep({ stepType: "Quiz" })] },
  "quiz with no correct option": { steps: [quizStep([opt("A", false), opt("B", false)])] },
  'quiz isCorrect "yes"': { steps: [quizStep([opt("A", "yes"), opt("B", false)])] },
  "quiz isCorrect missing": { steps: [quizStep([opt("A", true), { text: "B" }])] },
  "quiz isCorrect 1": { steps: [quizStep([opt("A", 1), opt("B", 0)])] },
  "option with no text": { steps: [quizStep([opt("A", true), { isCorrect: false }])] },
  "option that is a string": { steps: [quizStep(["A", "B"])] },
  "priority_action with no correct option": {
    steps: [situationalStep({ interactionType: "priority_action", options: [opt("A", false), opt("B", false)] })],
  },
  "situational without interactionType and no correct option": {
    steps: [situationalStep({ options: [opt("A", false), opt("B", false)] })],
  },
  "action_sequence with no correct option": {
    steps: [situationalStep({ interactionType: "action_sequence", options: [opt("A", false, { sequence_order: 1 }), opt("B", false, { sequence_order: 2 })] })],
  },
  'text step question isCorrect "yes"': {
    steps: [textStep({ quizQuestions: [{ questionText: "Q", options: [opt("A", "yes")] }] })],
  },
  "image_url 123": { top: { image_url: 123 } },
  "video_url {}": { top: { video_url: {} } },
  "mediaUrl 42": { steps: [textStep({ mediaUrl: 42 })] },
  "imageURL object": { steps: [quizStep([opt("A", true)], { imageURL: { a: 1 } })] },
  "cover_image 7": { level: { cover_image: 7 } },
  "coverImage array": { level: { coverImage: ["https://cdn.example.org/c.jpg"] } },
};
const PUT_SAMPLE = ["threshold 85.5", 'stepType "bogus"', "quiz with no correct option", "mediaUrl 42"];

// Mirrors useModuleSubmit.js's step mapping, so a hydrated flow is saved the way the builder saves it
function builderStepPayload(flow, index) {
  let questionsToSave = [];
  if (flow.type === "quiz") {
    questionsToSave =
      flow.quizQuestions?.map((q) => ({
        questionText: q.questionText,
        imageURL: q.imageURL || "",
        options: (q.options || []).map((o, optIdx) => ({
          text: o.text,
          isCorrect: optIdx === q.correctAnswerIndex || o.isCorrect === true,
          rationale: o.rationale,
        })),
      })) || [];
  } else if (flow.assessmentType === "situational" && flow.situationalScenarios?.length > 0) {
    questionsToSave = flow.situationalScenarios.map((scenario) => {
      const interaction = scenario.interactionType;
      let options = [];
      if (interaction === "priority_action") {
        options = scenario.options.map((o, optIdx) => ({
          text: o.text,
          isCorrect: optIdx === scenario.correctAnswerIndex || o.isCorrect === true,
          rationale: o.rationale,
        }));
      } else if (interaction === "hazard_identification") {
        options = scenario.hazards.map((h) => ({ text: h.text, isCorrect: h.isRequired, rationale: h.rationale }));
      } else if (interaction === "action_sequence") {
        options = scenario.sequenceSteps.map((s) => ({ text: s.text, isCorrect: true, sequence_order: s.order }));
      }
      return {
        questionText: scenario.scenarioDescription,
        imageURL: "",
        options,
        interactionType: interaction,
        rationale: scenario.rationale?.trim() || null,
      };
    });
  }
  return {
    stepOrder: index + 1,
    stepTitle: flow.title,
    stepContent: flow.type === "text" ? flow.textContent : "",
    mediaUrl: flow.finalMediaUrl,
    stepType: flow.type,
    is_final_assessment: flow.is_final_assessment || false,
    quizQuestions: questionsToSave,
  };
}

// Every step type and question shape the builder produces or re-saves
const BUILDER_STEPS = [
  textStep(),
  textStep({ stepTitle: "Watch", stepContent: "", mediaUrl: "http://localhost:5000/uploads/clip.mp4", stepType: "video" }),
  textStep({ stepTitle: "Handout", stepContent: "", mediaUrl: "https://cdn.example.org/handout.pdf", stepType: "pdf" }),
  quizStep([opt("A", false), opt("B", true), opt("C", false), opt("D", false)]),
  {
    stepTitle: "Situational",
    stepContent: "",
    mediaUrl: "",
    stepType: "situational",
    quizQuestions: [
      { questionText: "Priority", imageURL: "", interactionType: "priority_action", rationale: "r", options: [opt("A", true), opt("B", false), opt("C", false), opt("D", false)] },
      // the hazard editor lets every "required" box be unchecked
      { questionText: "No hazards", imageURL: "", interactionType: "hazard_identification", rationale: null, options: [opt("Sky", false), opt("Grass", false)] },
      { questionText: "Hazards", imageURL: "", interactionType: "hazard_identification", rationale: null, options: [opt("Wire", true), opt("Tree", true), opt("Sky", false)] },
      { questionText: "Sequence", imageURL: "", interactionType: "action_sequence", rationale: null, options: [{ text: "First", isCorrect: true, sequence_order: 1 }, { text: "Second", isCorrect: true, sequence_order: 2 }] },
    ],
  },
  situationalStep({ interactionType: "priority_action", options: [opt("A", true), opt("B", false)] }, "priority_action"),
  situationalStep({ interactionType: "hazard_identification", options: [opt("Wire", false), opt("Sky", false)] }, "hazard_identification"),
  situationalStep({ interactionType: "action_sequence", options: [{ text: "1", isCorrect: true, sequence_order: 1 }, { text: "2", isCorrect: true, sequence_order: 2 }] }, "action_sequence"),
];

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
        return { res, written: (await modulesNamed(name)).length > 0 };
      },
    },
    {
      label: "PUT /api/modules/:id (draft)",
      cases: PUT_SAMPLE,
      send: async (name, opts) => {
        const draft = await seedModule(`${name} target`, "draft", author.id);
        const res = await call(author, "PUT", `/api/modules/${draft}`, modulePayload(name, opts));
        const { rows } = await pool.query("SELECT modname FROM module_data WHERE mod_id = $1", [draft]);
        return { res, written: rows[0].modname !== `${RUN} ${name} target` };
      },
    },
    {
      label: "PUT /api/modules/:id (published -> revision)",
      cases: PUT_SAMPLE,
      send: async (name, opts) => {
        const published = await seedModule(`${name} target`, "published", author.id);
        const res = await call(author, "PUT", `/api/modules/${published}`, modulePayload(name, opts));
        return { res, written: (await modulesNamed(name)).length > 0 };
      },
    },
  ];

  for (const route of routes) {
    for (const name of route.cases) {
      await check(`${route.label} refuses ${name} with a 400 and writes nothing`, async () => {
        const { res, written } = await route.send(`bad ${name}`, BAD[name]);
        assert.ok(res.status === 400 && !written, `${res.status}${written ? " (written)" : ""} ${JSON.stringify(res.body)}`);
      });
    }
  }

  await check("POST /api/modules keeps numeric-string, blank and in-range thresholds", async () => {
    const thresholds = ["90", null, "", undefined, 100, 1, 0, 75];
    const res = await call(author, "POST", "/api/modules", modulePayload("good thresholds", {
      levels: thresholds.map((t) => ({ passing_threshold: t, steps: [textStep()] })),
    }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    created.modIds.push(res.body.data.mod_id);
    const { levels } = await storedStructure(res.body.data.mod_id);
    assert.deepEqual(levels.map((l) => l.passing_threshold), [90, 80, 80, 80, 100, 1, 80, 75]);
  });

  await check("builder module (all step types, hazard with none required) saves, then loads and re-saves unchanged", async () => {
    const res = await call(author, "POST", "/api/modules", modulePayload("builder", { steps: BUILDER_STEPS }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const modId = res.body.data.mod_id;
    created.modIds.push(modId);
    const before = await storedStructure(modId);
    assert.deepEqual(before.steps.map((s) => s.step_type),
      ["text", "video", "pdf", "quiz", "situational", "priority_action", "hazard_identification", "action_sequence"]);

    const { hydrateFlowStep } = await import(
      pathToFileURL(path.join(__dirname, "../../client/src/hooks/module-builder/hydrateFlowStep.js")).href
    );
    const edit = await call(author, "GET", `/api/modules/${modId}/edit-details`);
    assert.equal(edit.status, 200, JSON.stringify(edit.body));
    const data = edit.body.data;
    const resave = modulePayload("builder", {
      levels: data.levels.map((lvl) => ({
        levelOrder: lvl.levelOrder,
        levelTitle: lvl.levelTitle,
        levelDescription: lvl.levelDescription,
        passing_threshold: Number(lvl.passing_threshold || 80) || 80,
        cover_image: lvl.cover_image || null,
        coverImage: lvl.cover_image || null,
        steps: lvl.steps.map((s) => hydrateFlowStep(s, lvl.levelOrder)).map(builderStepPayload),
      })),
    });
    const put = await call(author, "PUT", `/api/modules/${modId}`, resave);
    assert.equal(put.status, 200, JSON.stringify(put.body));
    assert.deepEqual(await storedStructure(modId), before);
  });

  if (failures.length) throw new Error(`${failures.length} check(s) failed`);
  console.log("All module structure type regression checks passed.");
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
