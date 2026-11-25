/**
 * Regression test (audit P5-12): Better Auth's update-user stored any `image` string on the user
 * row: javascript: URLs, SVG data URIs and ~700 KB blobs all returned 200.
 *
 * The only UI that writes an avatar is ProfileAvatar.jsx: it re-encodes the picked file on a
 * canvas (utils/imageUtils.js compressImage, max 150 px) and sends `image` as a
 * data:image/jpeg;base64 URL through authClient.updateUser; the offline queue
 * (syncManager.js UPDATE_AVATAR) replays the same value. Google sign-in stores its https
 * profile picture on user creation (OAuth callback), not through update-user.
 *
 * Asserts:
 *   - POST /api/auth/update-user (HTTP, RUNNING LOCAL server) accepts PNG, JPEG and WEBP data URLs
 *     whose bytes match the declared type, within the size cap
 *   - rejects with a 400 and leaves the stored image unchanged: javascript:, SVG data URI,
 *     https URL, GIF data URL, PNG label on JPEG bytes, an over-size PNG, null, a number
 *   - a name-only update still works for a user whose stored image is an https URL (Google)
 *   - sign-up (in-process auth.api.signUpEmail, hooks run) with a javascript: image creates no user
 *
 * Fixtures are seeded in SQL and removed by exact id. Refuses non-loopback databases.
 * Run from the repo root:  node server/tests/avatar-image.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000), TEST_ORIGIN (default http://localhost:5173)
 */
const crypto = require("crypto");
const assert = require("assert/strict");

// Stub outgoing mail before anything that captures the transporter is loaded.
const { transporter } = require("../utils/mailer");
transporter.sendMail = async () => ({ stubbed: true });

const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const ORIGIN = process.env.TEST_ORIGIN || "http://localhost:5173";
const UA = "avatar-image-regression/1.0";
const RUN = `regress_av_${crypto.randomBytes(4).toString("hex")}`;
const SIGNUP_EMAIL = `${RUN}_signup@regression.invalid`;
const GOOGLE_PIC = "https://lh3.googleusercontent.com/a/regression-picture=s96-c";
const created = { userIds: [] };
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

async function createUser(label, image = null) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, image, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, 'resident', false, false, false, $4, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, image]
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

async function updateUser(user, body) {
  await resetAuthLimiter();
  const res = await fetch(`${BASE_URL}/api/auth/update-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Origin: ORIGIN, Cookie: user.cookie },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

// Each rejected call counts toward the 10-failure /api/auth limiter; clear the loopback auth_ counter
async function resetAuthLimiter() {
  for (const table of ["records_aggregated", "individual_records"]) {
    await pool.query(
      `DELETE FROM rate_limit.${table} WHERE key IN ('::/56', '::1', '127.0.0.1', '::ffff:127.0.0.1')
         AND session_id IN (SELECT id FROM rate_limit.sessions WHERE name_ = 'auth_')`
    );
  }
}

async function storedImage(id) {
  const { rows } = await pool.query('SELECT image FROM "user" WHERE id = $1', [id]);
  return rows[0].image;
}

const pad = (head, size) => Buffer.concat([Buffer.from(head), crypto.randomBytes(size - head.length)]);
const PNG = (size = 2048) => pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], size);
const JPEG = (size = 2048) => pad([0xff, 0xd8, 0xff, 0xe0], size);
const WEBP = (size = 2048) => {
  const b = crypto.randomBytes(size);
  b.write("RIFF", 0, "latin1");
  b.write("WEBP", 8, "latin1");
  return b;
};
const dataUrl = (type, bytes) => `data:image/${type};base64,${bytes.toString("base64")}`;

async function cleanup() {
  const lookup = await pool.query(`SELECT id FROM "user" WHERE id LIKE $1 OR email = $2`, [`${RUN}%`, SIGNUP_EMAIL]);
  const ids = [...new Set([...created.userIds, ...lookup.rows.map((r) => r.id)])];
  await pool.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [ids]);
  await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM account WHERE "userId" = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [ids]);
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE id = ANY($1) OR email = $2`, [ids, SIGNUP_EMAIL]);
  console.log(`cleanup: ${rows[0].n} fixture users left`);
}

async function main() {
  await assertLocalDatabase();
  const user = await createUser("resident");
  const google = await createUser("google", GOOGLE_PIC);

  for (const [name, image] of [
    ["JPEG data URL (what ProfileAvatar sends)", dataUrl("jpeg", JPEG())],
    ["PNG data URL", dataUrl("png", PNG())],
    ["WEBP data URL", dataUrl("webp", WEBP())],
    ["JPEG at 100 KB", dataUrl("jpeg", JPEG(100 * 1024))],
  ]) {
    await check(`accepted: ${name}`, async () => {
      const res = await updateUser(user, { image });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(await storedImage(user.id), image, "stored image");
    });
  }

  for (const [name, image] of [
    ["javascript: URL", "javascript:alert(1)"],
    ["SVG data URI", `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>').toString("base64")}`],
    ["https URL", "https://example.com/avatar.png"],
    ["GIF data URL", dataUrl("gif", pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 2048))],
    ["PNG label on JPEG bytes", dataUrl("png", JPEG())],
    ["SVG bytes labelled PNG", dataUrl("png", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'))],
    ["PNG over 100 KB", dataUrl("png", PNG(100 * 1024 + 1))],
    ["~700 KB blob", `data:image/png;base64,${"A".repeat(700000)}`],
    ["null", null],
    ["number", 12345],
  ]) {
    await check(`rejected 400, image unchanged: ${name}`, async () => {
      const before = await storedImage(user.id);
      const res = await updateUser(user, { image });
      assert.equal(res.status, 400, `status ${res.status} ${JSON.stringify(res.body)?.slice(0, 120)}`);
      assert.equal(typeof res.body?.message, "string", "400 carries a message");
      assert.equal(await storedImage(user.id), before, "stored image changed");
    });
  }

  await check("name-only update still works for a Google user with an https picture", async () => {
    const res = await updateUser(google, { first_name: "Regression", last_name: "Google" });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(await storedImage(google.id), GOOGLE_PIC);
  });

  await check("sign-up with a javascript: image creates no user", async () => {
    const barangay = (await pool.query("SELECT name FROM barangays ORDER BY id LIMIT 1")).rows[0].name;
    let rejected = false;
    try {
      await auth.api.signUpEmail({
        body: {
          email: SIGNUP_EMAIL, password: `Zz-${crypto.randomBytes(6).toString("hex")}-Aa1!`,
          name: "Regression Signup", first_name: "Regression", last_name: "Signup", barangay, image: "javascript:alert(1)",
        },
        headers: new Headers({ "user-agent": UA }),
      });
    } catch (err) {
      rejected = err.statusCode === 400;
    }
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE email = $1`, [SIGNUP_EMAIL]);
    assert.equal(rows[0].n, 0, "user row created");
    assert.equal(rejected, true, "sign-up not rejected with 400");
  });
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
