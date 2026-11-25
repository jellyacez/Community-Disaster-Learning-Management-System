/**
 * Regression test: system branding (docs/specs/branding.md, audit P3-02) and support-email validation (M10).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that:
 *   - GET /api/public/branding answers signed out, briefly cacheable, with the name, version and logo URL
 *   - PATCH /api/admin/settings/branding validates the name (2-60 chars, no control characters)
 *   - logos are PNG/JPEG/WEBP data URLs whose bytes match the type, at most 500 KB decoded;
 *     SVG, mislabelled bytes, URLs and malformed base64 are refused with 400 and change nothing
 *   - GET /api/public/branding/logo serves the exact bytes, the right type, nosniff, immutable per version
 *   - remove_logo restores the default; a legacy SVG or URL value in the DB is never served
 *   - every change bumps branding_version and pushes BRANDING_UPDATED over SSE
 *   - only admins with manage_system_settings may save
 *   - PATCH /api/admin/settings/organization refuses a malformed support email and long footers
 *
 * Fixtures (one user and session per role) are deleted by id; the branding and organization rows are
 * restored to what they were. Refuses non-loopback databases and LMS_db.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> TEST_BASE_URL=http://localhost:<port> node server/tests/branding.regression.cjs
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "branding-regression/1.0";
const RUN = `regress_br_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;
const BRANDING = "/api/admin/settings/branding";
const ORG = "/api/admin/settings/organization";
const PUBLIC = "/api/public/branding";
const SETTING_KEYS = ["system_name", "system_logo", "branding_version", "support_email", "org_footer_text"];

const created = { userIds: [] };
let savedRows = null;

// A real 1x1 PNG, plus buffers that only need the right magic bytes (the server checks signatures, not pixels)
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(60, 1), Buffer.from([0xff, 0xd9])]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0, 0, 0]), Buffer.from("WEBPVP8 "), Buffer.alloc(40, 2)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const padded = (size) => Buffer.concat([PNG_SIG, Buffer.alloc(size - PNG_SIG.length, 7)]);
const dataUrl = (type, buf) => `data:image/${type};base64,${buf.toString("base64")}`;

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

async function createSession(role) {
  const id = `${RUN}_${role}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, true, false, false, NOW(), NOW())`,
    [id, `Regression ${role}`, `${id}@${EMAIL_DOMAIN}`, role]
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
  return { id, role, cookie: `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}` };
}

async function call(session, method, path, body) {
  const headers = { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA };
  if (session) headers.Cookie = session.cookie;
  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
}

async function raw(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { "User-Agent": UA } });
  return { status: res.status, headers: res.headers, bytes: Buffer.from(await res.arrayBuffer()) };
}

async function setting(key) {
  const { rows } = await pool.query("SELECT value FROM system_settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

async function putSetting(key, value) {
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
}

// Opens the SSE stream and resolves true once `event` arrives, false after `ms`.
function waitForEvent(session, event, ms) {
  const controller = new AbortController();
  const ready = fetch(`${BASE_URL}/api/notif/stream`, {
    headers: { Cookie: session.cookie, "User-Agent": UA, Accept: "text/event-stream" },
    signal: controller.signal,
  });
  const seen = (async () => {
    const res = await ready;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) return false;
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes(`event: ${event}\n`)) return true;
    }
  })().catch(() => false);
  const timer = new Promise((resolve) => setTimeout(() => resolve(false), ms));
  return {
    connected: ready.then(() => new Promise((r) => setTimeout(r, 200))),
    result: Promise.race([seen, timer]).finally(() => controller.abort()),
  };
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`ok - ${name}`);
  } catch (err) {
    results.push(false);
    console.log(`not ok - ${name}\n      ${err.message.split("\n")[0]}`);
  }
}

async function main() {
  await assertScratchDatabase();
  const { rows } = await pool.query("SELECT key, value FROM system_settings WHERE key = ANY($1)", [SETTING_KEYS]);
  savedRows = rows;

  const admin = await createSession("system_admin");
  const mdrrmo = await createSession("mdrrmo_admin");
  const resident = await createSession("resident");

  // Start from a known state: default name, no logo
  await pool.query("DELETE FROM system_settings WHERE key = 'system_logo'");
  await putSetting("system_name", "Bacolor Disaster LMS");

  await check("public branding answers signed out with name, integer version, no logo, 60 s cache", async () => {
    const r = await call(null, "GET", PUBLIC);
    assert.equal(r.status, 200);
    assert.equal(r.body.name, "Bacolor Disaster LMS");
    assert.ok(Number.isInteger(r.body.version), `version ${JSON.stringify(r.body.version)}`);
    assert.equal(r.body.logo, null);
    assert.match(r.headers.get("cache-control") || "", /public, max-age=60/);
  });

  await check("logo endpoint 404s while no logo is stored", async () => {
    assert.equal((await raw(`${PUBLIC}/logo`)).status, 404);
  });

  await check("unauthenticated, resident and mdrrmo_admin cannot save branding", async () => {
    assert.equal((await call(null, "PATCH", BRANDING, { system_name: "Nope LMS" })).status, 401);
    assert.equal((await call(resident, "PATCH", BRANDING, { system_name: "Nope LMS" })).status, 403);
    assert.equal((await call(mdrrmo, "PATCH", BRANDING, { system_name: "Nope LMS" })).status, 403);
    assert.equal(await setting("system_name"), "Bacolor Disaster LMS");
  });

  await check("an empty body is refused", async () => {
    assert.equal((await call(admin, "PATCH", BRANDING, {})).status, 400);
  });

  for (const [label, name] of [["1 character", "A"], ["61 characters", "N".repeat(61)], ["CR/LF", "Bad\r\nBcc: x@y.z"], ["tab", "Bad\tName"], ["only spaces", "      "]]) {
    await check(`name with ${label} is refused and nothing changes`, async () => {
      const r = await call(admin, "PATCH", BRANDING, { system_name: name });
      assert.equal(r.status, 400, JSON.stringify(r.body));
      assert.match(r.body.message, /System name/);
      assert.equal(await setting("system_name"), "Bacolor Disaster LMS");
    });
  }

  await check("a name is trimmed, tags stripped, '&' kept; the version goes up; the public read shows it at once", async () => {
    const before = (await call(null, "GET", PUBLIC)).body.version;
    const r = await call(admin, "PATCH", BRANDING, { system_name: "  <b>Fire</b> & Rescue LMS  " });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await setting("system_name"), "Fire & Rescue LMS");
    const pub = (await call(null, "GET", PUBLIC)).body;
    assert.equal(pub.name, "Fire & Rescue LMS");
    assert.equal(pub.version, before + 1);
  });

  await check("exactly 60 characters is accepted", async () => {
    assert.equal((await call(admin, "PATCH", BRANDING, { system_name: "S".repeat(60) })).status, 200);
  });

  for (const [type, buf] of [["png", PNG], ["jpeg", JPEG], ["webp", WEBP]]) {
    await check(`a ${type.toUpperCase()} logo is saved and served byte-exact with nosniff and a per-version immutable cache`, async () => {
      const r = await call(admin, "PATCH", BRANDING, { system_logo: dataUrl(type, buf) });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      const pub = (await call(null, "GET", PUBLIC)).body;
      assert.ok(pub.logo && pub.logo.url, "no logo url");
      assert.equal(pub.logo.url, `${PUBLIC}/logo?v=${pub.version}`);
      const img = await raw(pub.logo.url);
      assert.equal(img.status, 200);
      assert.equal(img.headers.get("content-type"), `image/${type}`);
      assert.equal(img.headers.get("x-content-type-options"), "nosniff");
      assert.match(img.headers.get("content-security-policy") || "", /default-src 'none'/);
      assert.match(img.headers.get("cache-control") || "", /immutable/);
      assert.ok(img.bytes.equals(buf), "served bytes differ");
      const stale = await raw(`${PUBLIC}/logo?v=${pub.version - 1}`);
      assert.doesNotMatch(stale.headers.get("cache-control") || "", /immutable/);
    });
  }

  const logoBefore = async () => setting("system_logo");
  const refusals = [
    ["an SVG data URL", dataUrl("svg+xml", SVG), /SVG/],
    ["SVG bytes labelled image/png", dataUrl("png", SVG), /valid PNG, JPG or WEBP/],
    ["PNG bytes labelled image/jpeg", dataUrl("jpeg", PNG), /valid PNG, JPG or WEBP/],
    ["an https URL", "https://example.com/logo.png", /PNG, JPG or WEBP/],
    ["malformed base64", "data:image/png;base64,iVBOR%%%w0K", /PNG, JPG or WEBP/],
    ["image/gif", dataUrl("gif", Buffer.from("GIF89a")), /PNG, JPG or WEBP/],
    ["500 KB + 1 byte", dataUrl("png", padded(500 * 1024 + 1)), /500 KB/],
  ];
  for (const [label, value, msg] of refusals) {
    await check(`${label} is refused with 400 and the stored logo is unchanged`, async () => {
      const prev = await logoBefore();
      const r = await call(admin, "PATCH", BRANDING, { system_logo: value });
      assert.equal(r.status, 400, JSON.stringify(r.body));
      assert.match(r.body.message, msg);
      assert.equal(await logoBefore(), prev);
    });
  }

  await check("a name and an invalid logo together change neither", async () => {
    const prevName = await setting("system_name");
    const r = await call(admin, "PATCH", BRANDING, { system_name: "Should Not Save", system_logo: dataUrl("svg+xml", SVG) });
    assert.equal(r.status, 400);
    assert.equal(await setting("system_name"), prevName);
  });

  await check("exactly 500 KB is accepted", async () => {
    const r = await call(admin, "PATCH", BRANDING, { system_logo: dataUrl("png", padded(500 * 1024)) });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  });

  await check("remove_logo brings back the default and the logo endpoint 404s", async () => {
    const r = await call(admin, "PATCH", BRANDING, { remove_logo: true });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(await setting("system_logo"), null);
    assert.equal((await call(null, "GET", PUBLIC)).body.logo, null);
    assert.equal((await raw(`${PUBLIC}/logo`)).status, 404);
  });

  for (const [label, value] of [["an SVG", dataUrl("svg+xml", SVG)], ["a URL", "https://example.com/logo.png"], ["mislabelled bytes", dataUrl("png", SVG)]]) {
    await check(`a legacy stored value (${label}) is never served and the admin read flags it`, async () => {
      await putSetting("system_logo", value);
      await pool.query(`UPDATE system_settings SET value = (value::int + 1)::text WHERE key = 'branding_version'`);
      // the public read caches for 60 s in process; a no-op name save clears it the same way an admin save would
      await call(admin, "PATCH", BRANDING, { system_name: await setting("system_name") });
      assert.equal((await call(null, "GET", PUBLIC)).body.logo, null);
      assert.equal((await raw(`${PUBLIC}/logo`)).status, 404);
      const adminRead = await call(admin, "GET", "/api/admin/settings/logo");
      assert.equal(adminRead.status, 200);
      assert.equal(adminRead.body.data.logo_supported, false);
    });
  }

  await check("a save pushes BRANDING_UPDATED to signed-in clients", async () => {
    const listener = waitForEvent(resident, "BRANDING_UPDATED", 4000);
    await listener.connected;
    const r = await call(admin, "PATCH", BRANDING, { system_name: "Event LMS" });
    assert.equal(r.status, 200);
    assert.equal(await listener.result, true, "no BRANDING_UPDATED event");
  });

  await check("a save writes one activity_log row naming what changed", async () => {
    const { rows: before } = await pool.query("SELECT COUNT(*)::int AS n FROM activity_log WHERE user_id = $1", [admin.id]);
    await call(admin, "PATCH", BRANDING, { system_name: "Logged LMS" });
    await new Promise((r) => setTimeout(r, 300)); // logActivity is fire-and-forget
    const { rows: after } = await pool.query("SELECT act_log AS action FROM activity_log WHERE user_id = $1", [admin.id]);
    assert.equal(after.length, before[0].n + 1);
    assert.ok(after.some((r) => /Updated system branding \(name\)/.test(r.action)), JSON.stringify(after.map((r) => r.action)));
  });

  for (const [label, value] of [["CRLF header injection", "help@example.org\r\nBcc: x@y.z"], ["no @", "not-an-email"], ["no domain dot", "help@localhost"], ["255 characters", `${"a".repeat(243)}@example.org`]]) {
    await check(`support email with ${label} is refused`, async () => {
      const prev = await setting("support_email");
      const r = await call(admin, "PATCH", ORG, { support_email: value });
      assert.equal(r.status, 400, JSON.stringify(r.body));
      assert.equal(await setting("support_email"), prev);
    });
  }

  await check("a valid support email is saved; an empty one clears it", async () => {
    assert.equal((await call(admin, "PATCH", ORG, { support_email: "help@example.org" })).status, 200);
    assert.equal(await setting("support_email"), "help@example.org");
    assert.equal((await call(admin, "PATCH", ORG, { support_email: "" })).status, 200);
    assert.equal(await setting("support_email") || "", "");
  });

  await check("an org footer over 200 characters or with a newline is refused", async () => {
    assert.equal((await call(admin, "PATCH", ORG, { org_footer_text: "F".repeat(201) })).status, 400);
    assert.equal((await call(admin, "PATCH", ORG, { org_footer_text: "Line\r\nBreak" })).status, 400);
    assert.equal((await call(admin, "PATCH", ORG, { org_footer_text: "Bacolor MDRRMO, Pampanga" })).status, 200);
  });
}

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (savedRows) {
      await client.query("DELETE FROM system_settings WHERE key = ANY($1)", [SETTING_KEYS]);
      for (const { key, value } of savedRows) {
        await client.query("INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())", [key, value]);
      }
      // branding_version only goes up, so clients never mistake the restored state for a cached one
      await client.query(`UPDATE system_settings SET value = (value::int + 1000)::text WHERE key = 'branding_version'`);
    }
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [created.userIds]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log(`cleanup error: ${err.message}`);
  } finally {
    client.release();
  }
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE id LIKE $1`, [`${RUN}%`]);
  console.log(`remaining fixture users: ${rows[0].n}`);
}

main()
  .catch((err) => {
    results.push(false);
    console.log(`ERROR ${err.stack}`);
  })
  .finally(async () => {
    await cleanup();
    const failed = results.filter((r) => !r).length;
    console.log(`\n${results.length - failed} passed, ${failed} failed`);
    await pool.end().catch(() => {});
    process.exit(failed ? 1 : 0);
  });
