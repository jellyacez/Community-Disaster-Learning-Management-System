/**
 * Regression test: the settings allowlist (P5-12, M5) must not break users whose stored settings
 * already hold keys, before merge of fix/input-robustness.
 *
 * Production rows hold exactly announcements, lastSeenAnnouncementId, reminders and theme (owner's
 * read-only check, 2026-11-26). The client writes settings only by spreading what GET returned and
 * changing one key (useNotificationPreferences.updatePreference), and the offline queue replays
 * that same object (syncManager UPDATE_NOTIFICATION_SETTINGS -> PUT /api/users/me/settings). The
 * bell (NotificationDropdown) writes lastSeenAnnouncementId as String(announcement id), as it has
 * since 87f5e68.
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts:
 *   - a user whose stored settings hold all four production keys can turn reminders off and
 *     announcements off (payload = GET + one key), and lastSeenAnnouncementId and theme survive
 *   - the bell marking an announcement seen (GET + lastSeenAnnouncementId: String(id)) saves
 *   - the offline replay of a queued toggle (the same GET + one key object, sent again) saves
 *   - a stored key that is no longer allowed (an unknown key, or lastSeenAnnouncementId stored as
 *     a number) is not served by GET, doesn't make the next save a 400, and is dropped on save
 *
 * Fixtures (users, sessions, one announcement) are seeded in SQL and removed by exact id in
 * `finally`. Loopback databases only.
 *
 * Run from the repo root:  node server/tests/settings-stored-keys.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "settings-stored-keys-regression/1.0";
const RUN = `regress_ssk_${crypto.randomBytes(4).toString("hex")}`;

const created = { userIds: [], announcementIds: [] };
let failures = 0;

function check(label, condition, detail) {
  if (condition) console.log(`ok - ${label}`);
  else {
    failures++;
    console.log(`not ok - ${label}: ${detail}`);
  }
}

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, settings) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt", settings)
     VALUES ($1, $2, $3, true, 'resident', false, false, false, NOW(), NOW(), $4::jsonb)`,
    [id, `Regression ${label}`, `${id}@regression.invalid`, JSON.stringify(settings)]
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

async function call(user, method, body) {
  const res = await fetch(`${BASE_URL}/api/users/me/settings`, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const stored = async (user) => (await pool.query(`SELECT settings FROM "user" WHERE id = $1`, [user.id])).rows[0].settings;

/** What useNotificationPreferences.updatePreference sends: the GET result plus one key. */
async function updatePreference(user, key, value) {
  const current = (await call(user, "GET")).body;
  const payload = { ...current, [key]: value };
  return { payload, res: await call(user, "PUT", payload) };
}

async function run() {
  await assertLocalDatabase();

  const author = await createUser("author", {});
  const { rows } = await pool.query(
    `INSERT INTO announcements (title, content, author_id, barangay_id, priority)
     VALUES ($1, 'Settings regression fixture', $2, NULL, 'standard') RETURNING id`,
    [`${RUN} announcement`, author.id]
  );
  const announcementId = rows[0].id;
  created.announcementIds.push(announcementId);

  // Production shape: all four keys, lastSeenAnnouncementId as the bell writes it
  const prodShape = { announcements: true, reminders: true, theme: "dark", lastSeenAnnouncementId: "7" };
  const user = await createUser("prod", prodShape);

  const get = await call(user, "GET");
  check("GET serves all four production keys", get.status === 200 && JSON.stringify(get.body) === JSON.stringify(prodShape),
    `${get.status} ${JSON.stringify(get.body)}`);

  let r = await updatePreference(user, "reminders", false);
  let s = await stored(user);
  check("turning reminders off (GET + reminders) saves and keeps lastSeenAnnouncementId and theme",
    r.res.status === 200 && s.reminders === false && s.lastSeenAnnouncementId === "7" && s.theme === "dark",
    `${r.res.status} ${JSON.stringify(r.res.body)} stored ${JSON.stringify(s)}`);

  r = await updatePreference(user, "announcements", false);
  s = await stored(user);
  check("turning announcements off (GET + announcements) saves and keeps lastSeenAnnouncementId",
    r.res.status === 200 && s.announcements === false && s.lastSeenAnnouncementId === "7",
    `${r.res.status} ${JSON.stringify(r.res.body)} stored ${JSON.stringify(s)}`);

  r = await updatePreference(user, "lastSeenAnnouncementId", String(announcementId));
  s = await stored(user);
  check("the bell marking an announcement seen (GET + String(id)) saves it",
    r.res.status === 200 && s.lastSeenAnnouncementId === String(announcementId),
    `${r.res.status} ${JSON.stringify(r.res.body)} stored ${JSON.stringify(s)}`);

  // A toggle queued offline, replayed later: the same object, sent again unchanged
  const queued = (await updatePreference(user, "reminders", true)).payload;
  const replay = await call(user, "PUT", queued);
  s = await stored(user);
  check("the offline replay of a queued toggle saves", replay.status === 200 && s.reminders === true,
    `${replay.status} ${JSON.stringify(replay.body)} stored ${JSON.stringify(s)}`);

  // Keys stored before the allowlist that it no longer accepts
  const legacy = await createUser("legacy", { announcements: true, reminders: true, legacyFlag: "x", lastSeenAnnouncementId: 42 });
  const legacyGet = await call(legacy, "GET");
  check("GET doesn't serve a stored unknown key or a numeric lastSeenAnnouncementId",
    legacyGet.status === 200 && !("legacyFlag" in legacyGet.body) && !("lastSeenAnnouncementId" in legacyGet.body),
    `${legacyGet.status} ${JSON.stringify(legacyGet.body)}`);

  r = await updatePreference(legacy, "reminders", false);
  s = await stored(legacy);
  check("a stored key the allowlist no longer accepts doesn't make the next save a 400, and is dropped",
    r.res.status === 200 && s.reminders === false && !("legacyFlag" in s) && !("lastSeenAnnouncementId" in s),
    `${r.res.status} ${JSON.stringify(r.res.body)} stored ${JSON.stringify(s)}`);

  if (failures) throw new Error(`${failures} check(s) failed`);
  console.log("All stored-settings regression checks passed.");
}

run()
  .catch((err) => {
    console.error(`FAILED: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.query(`DELETE FROM announcements WHERE id = ANY($1)`, [created.announcementIds]);
    await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
    const { rowCount } = await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
    console.log(`cleanup: ${rowCount} fixture users, ${created.announcementIds.length} announcements`);
    await pool.end();
  });
