/**
 * Regression test: module create/update stored step mediaUrl, question imageURL and level
 * cover_image/coverImage without URL validation (validation audit M1). Only image_url and
 * video_url went through validateUrl.
 *
 * media_url ends up in <a href>, <iframe src>, <video><source src> and <img src> in the
 * learner viewer (StepContent.jsx); cover_image in <img src> (CurriculumMap.jsx).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that, on POST /api/modules,
 * PUT /api/modules/:id of a draft (updateModuleTransaction) and PUT of a published module
 * (the revision clone through createModuleTransaction):
 *   - javascript:, vbscript:, data:text/html, file:, protocol-relative //host, relative paths
 *     and garbage in mediaUrl or imageURL, and the same plus non-image or non-base64 data
 *     URLs in cover_image/coverImage, return 400 and write nothing
 *   - what the builder sends today still saves: "" / null, absolute http(s) URLs (upload-media
 *     answers with one), and a FileReader data:image/...;base64 cover photo
 *
 * Fixtures are seeded directly into the database from server/.env and removed by exact ID
 * (and by the run's name prefix for API-created rows) in `finally`. Loopback databases only.
 *
 * Run from the repo root:  node server/tests/module-media-urls.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "module-media-urls-regression/1.0";
const RUN = `regress_mmu_${crypto.randomBytes(4).toString("hex")}`;

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

async function call(user, method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// 1x1 PNG, as FileReader.readAsDataURL hands it to SequenceCanvas
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const SVG_DATA_URL = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString("base64")}`;

/** Builder-shaped payload: one text step with media, one quiz step with an image, a level cover. */
function modulePayload(name, { mediaUrl = "", imageURL = "", cover = null, coverKey = "both" } = {}) {
  const level = {
    levelOrder: 1,
    levelTitle: "Level 1",
    levelDescription: "",
    passing_threshold: 80,
    is_locked_by_default: true,
    steps: [
      { stepOrder: 1, stepTitle: "Read", stepContent: "<p>x</p>", mediaUrl, stepType: "text", quizQuestions: [] },
      {
        stepOrder: 2,
        stepTitle: "Quiz",
        stepContent: "",
        mediaUrl: "",
        stepType: "quiz",
        quizQuestions: [
          {
            questionText: "Pick one",
            imageURL,
            options: [
              { text: "A", isCorrect: true },
              { text: "B", isCorrect: false },
            ],
          },
        ],
      },
    ],
  };
  if (coverKey === "both" || coverKey === "cover_image") level.cover_image = cover;
  if (coverKey === "both" || coverKey === "coverImage") level.coverImage = cover;
  return {
    moduleName: `${RUN} ${name}`,
    moduleCategory: "General",
    description: "<p>Module media URL regression fixture</p>",
    level: "Level 1",
    duration: "15 mins",
    image_url: "",
    video_url: "",
    status: "draft",
    levels: [level],
  };
}

async function seedModule(label, status, authorId) {
  const { rows } = await pool.query(
    `INSERT INTO module_data (modname, modcat, description, level, duration, status, author_id)
     VALUES ($1, 'General', 'Module media URL regression fixture', 'Level 1', '15 mins', $2, $3) RETURNING mod_id`,
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

async function storedMedia(modId) {
  const { rows } = await pool.query(
    `SELECT md.modname,
            (SELECT array_agg(l.cover_image) FROM levels l WHERE l.mod_id = md.mod_id) AS covers,
            (SELECT array_agg(ms.media_url ORDER BY ms.step_order) FROM module_steps ms JOIN levels l ON l.level_id = ms.level_id WHERE l.mod_id = md.mod_id) AS media,
            (SELECT array_agg(q.image_url) FROM questions q WHERE q.mod_id = md.mod_id) AS images
     FROM module_data md WHERE md.mod_id = $1`,
    [modId]
  );
  return rows[0];
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

const BAD_URLS = [
  "javascript:alert(document.cookie)",
  "JavaScript:alert(1)",
  "vbscript:msgbox(1)",
  "data:text/html,<script>alert(1)</script>",
  "file:///etc/passwd",
  "//evil.example/x.png",
  "/uploads/relative.png",
  "not a url",
];
const BAD_COVERS = [
  ...BAD_URLS,
  "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
  "data:image/png,rawbytes",
  "data:image/png;base64,***",
  "data:application/octet-stream;base64,AAAA",
];
const GOOD_URLS = ["", null, "https://cdn.example.org/media/step.mp4", "http://localhost:5000/uploads/abc-123.pdf"];
const GOOD_COVERS = [null, "", PNG_DATA_URL, SVG_DATA_URL, "https://cdn.example.org/cover.jpg"];

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

  // Each route answers each bad value with a 400 and writes nothing
  const routes = [
    {
      label: "POST /api/modules",
      send: async (name, opts) => {
        const res = await call(author, "POST", "/api/modules", modulePayload(name, opts));
        return { res, written: (await modulesNamed(name)).length > 0 };
      },
    },
    {
      label: "PUT /api/modules/:id (draft)",
      send: async (name, opts) => {
        const draft = await seedModule(`${name} target`, "draft", author.id);
        const res = await call(author, "PUT", `/api/modules/${draft}`, modulePayload(name, opts));
        return { res, written: (await storedMedia(draft)).modname !== `${RUN} ${name} target` };
      },
    },
    {
      label: "PUT /api/modules/:id (published -> revision)",
      send: async (name, opts) => {
        const published = await seedModule(`${name} target`, "published", author.id);
        const res = await call(author, "PUT", `/api/modules/${published}`, modulePayload(name, opts));
        return { res, written: (await modulesNamed(name)).length > 0 };
      },
    },
  ];

  const fields = [
    ["mediaUrl", BAD_URLS, (v) => ({ mediaUrl: v })],
    ["imageURL", BAD_URLS, (v) => ({ imageURL: v })],
    ["cover_image", BAD_COVERS, (v) => ({ cover: v, coverKey: "cover_image" })],
    ["coverImage", BAD_COVERS, (v) => ({ cover: v, coverKey: "coverImage" })],
  ];

  for (const route of routes) {
    for (const [field, values, opts] of fields) {
      await check(`${route.label} refuses a bad ${field} with a 400 and writes nothing`, async () => {
        const accepted = [];
        for (const [i, value] of values.entries()) {
          const { res, written } = await route.send(`bad ${field} ${i}`, opts(value));
          if (res.status !== 400 || written) accepted.push(`${JSON.stringify(value)} -> ${res.status}${written ? " (written)" : ""}`);
        }
        assert.equal(accepted.length, 0, `accepted ${accepted.join("; ")}`);
      });
    }
  }

  // What the builder sends today keeps saving, and is stored as sent
  await check("POST /api/modules stores empty, null and absolute http(s) mediaUrl/imageURL", async () => {
    for (const [i, value] of GOOD_URLS.entries()) {
      const res = await call(author, "POST", "/api/modules", modulePayload(`good url ${i}`, { mediaUrl: value, imageURL: value }));
      assert.equal(res.status, 201, `${JSON.stringify(value)}: ${JSON.stringify(res.body)}`);
      created.modIds.push(res.body.data.mod_id);
      const row = await storedMedia(res.body.data.mod_id);
      assert.equal(row.media[0], value, "media_url stored as sent");
      assert.equal(row.images[0], value || "", "question image_url stored as sent");
    }
  });

  await check("POST /api/modules stores a FileReader data:image cover, an https cover or none", async () => {
    for (const [i, value] of GOOD_COVERS.entries()) {
      const res = await call(author, "POST", "/api/modules", modulePayload(`good cover ${i}`, { cover: value }));
      assert.equal(res.status, 201, `${JSON.stringify(value)?.slice(0, 40)}: ${JSON.stringify(res.body)}`);
      created.modIds.push(res.body.data.mod_id);
      assert.equal((await storedMedia(res.body.data.mod_id)).covers[0], value || null);
    }
  });

  await check("PUT /api/modules/:id (draft) saves builder media values", async () => {
    const draft = await seedModule("good draft target", "draft", author.id);
    const res = await call(author, "PUT", `/api/modules/${draft}`, modulePayload("good draft", {
      mediaUrl: "http://localhost:5000/uploads/abc.mp4",
      imageURL: "https://cdn.example.org/q.png",
      cover: PNG_DATA_URL,
    }));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const row = await storedMedia(draft);
    assert.equal(row.media[0], "http://localhost:5000/uploads/abc.mp4");
    assert.equal(row.images[0], "https://cdn.example.org/q.png");
    assert.equal(row.covers[0], PNG_DATA_URL);
  });

  await check("PUT /api/modules/:id (published) clones a revision with builder media values", async () => {
    const published = await seedModule("good published target", "published", author.id);
    const res = await call(author, "PUT", `/api/modules/${published}`, modulePayload("good revision", {
      mediaUrl: "https://cdn.example.org/step.pdf",
      cover: SVG_DATA_URL,
    }));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    created.modIds.push(res.body.data.mod_id);
    const row = await storedMedia(res.body.data.mod_id);
    assert.equal(row.media[0], "https://cdn.example.org/step.pdf");
    assert.equal(row.covers[0], SVG_DATA_URL);
  });

  if (failures.length) throw new Error(`${failures.length} check(s) failed`);
  console.log("All module media URL regression checks passed.");
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
