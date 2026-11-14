/**
 * Regression test for audit finding H3: a signed-in user could change their own
 * barangay_id (moving a barangay_admin into another jurisdiction) and twoFactorEnabled
 * through Better Auth's POST /update-user.
 *
 * Runs Better Auth in-process through auth.api and asserts:
 *   1. update-user { barangay_id } is rejected and the stored barangay is unchanged
 *   2. update-user { twoFactorEnabled: true } is rejected and the flag stays false
 *   3. update-user { twoFactorEnabled: false } cannot clear an enabled flag
 *   4. update-user { name } still works
 *   5. sign-up with a barangay still stores barangay_id (set by the after-hook)
 *
 * Run it in both MFA modes, since the twoFactor plugin is registered only when
 * MFA_ENABLED=true (from the repo root):
 *   node server/tests/user-field-lock.regression.cjs
 *   MFA_ENABLED=true node server/tests/user-field-lock.regression.cjs
 *
 * Fixtures are seeded directly into the database from server/.env and removed by exact
 * ID. Outgoing email is stubbed. Refuses to run unless the database is on loopback.
 */
const crypto = require("crypto");
const assert = require("assert/strict");

// Stub outgoing mail before anything that captures the transporter is loaded.
const { transporter } = require("../utils/mailer");
transporter.sendMail = async () => ({ stubbed: true });

const pool = require("../config/db");
const { auth } = require("../utils/auth");

const RUN = `regress_lock_${crypto.randomBytes(4).toString("hex")}`;
const UA = "user-field-lock-regression/1.0";
const SIGNUP_EMAIL = `${RUN}_signup@example.invalid`;
const created = { userIds: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role, barangayId, twoFactorEnabled) {
  const id = `${RUN}_${label}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, barangay_id, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, $4, $5, false, false, $6, NOW(), NOW())`,
    [id, `Regression ${label}`, `${id}@example.invalid`, role, twoFactorEnabled, barangayId]
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
  try {
    await auth.api.updateUser({ body, headers: new Headers({ cookie: user.cookie, "user-agent": UA }) });
    return { ok: true };
  } catch (err) {
    return { ok: false, status: err.statusCode, code: err.body?.code };
  }
}

async function stored(id) {
  const { rows } = await pool.query(`SELECT name, barangay_id, "twoFactorEnabled" FROM "user" WHERE id = $1`, [id]);
  return rows[0];
}

async function cleanup() {
  const lookup = await pool.query(`SELECT id FROM "user" WHERE id LIKE $1 OR email = $2`, [`${RUN}%`, SIGNUP_EMAIL]);
  const ids = [...new Set([...created.userIds, ...lookup.rows.map((r) => r.id)])];
  await pool.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [ids]);
  await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM account WHERE "userId" = ANY($1)`, [ids]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [ids]);

  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM "user" WHERE id = ANY($1) OR email = $2) AS users,
       (SELECT COUNT(*)::int FROM session WHERE "userId" = ANY($1)) AS sessions,
       (SELECT COUNT(*)::int FROM account WHERE "userId" = ANY($1)) AS accounts,
       (SELECT COUNT(*)::int FROM activity_log WHERE user_id = ANY($1)) AS activity_log`,
    [ids, SIGNUP_EMAIL]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left rows behind");
}

async function main() {
  await assertLocalDatabase();
  console.log(`MFA_ENABLED=${process.env.MFA_ENABLED === "true"}`);
  const barangays = (await pool.query("SELECT id, name FROM barangays ORDER BY id LIMIT 2")).rows;
  assert.equal(barangays.length, 2, "needs at least two barangays");
  const [home, other] = barangays;

  const admin = await createUser("brgy", "barangay_admin", home.id, false);
  const enrolled = await createUser("enrolled", "barangay_admin", home.id, true);

  const moved = await updateUser(admin, { barangay_id: other.id });
  console.log("barangay_id change:", JSON.stringify(moved));
  assert.equal(moved.ok, false, "barangay_id must not be settable through update-user");
  assert.equal((await stored(admin.id)).barangay_id, home.id, "barangay_id must stay unchanged");
  console.log("ok - barangay_id change rejected, stored barangay unchanged");

  const enabled = await updateUser(admin, { twoFactorEnabled: true });
  console.log("twoFactorEnabled=true:", JSON.stringify(enabled));
  assert.equal(enabled.ok, false, "twoFactorEnabled must not be settable through update-user");
  assert.equal((await stored(admin.id)).twoFactorEnabled, false, "twoFactorEnabled must stay false");
  console.log("ok - twoFactorEnabled=true rejected, flag still false");

  await updateUser(enrolled, { twoFactorEnabled: false });
  assert.equal((await stored(enrolled.id)).twoFactorEnabled, true, "an enabled flag must not be cleared through update-user");
  console.log("ok - twoFactorEnabled=false cannot clear an enabled flag");

  // Name changes go through first/middle/last_name; the server derives `name` (personName.js)
  // Only the server writes these: archive endpoints and the password-change cooldown
  const archivedSelf = await updateUser(admin, { archived: true });
  assert.equal(archivedSelf.ok, false, "archived must not be settable through update-user");
  const cooldownReset = await updateUser(admin, { lastPasswordChange: "2000-01-01T00:00:00.000Z" });
  assert.equal(cooldownReset.ok, false, "lastPasswordChange must not be settable through update-user");
  const lockedCols = (await pool.query(`SELECT archived, "lastPasswordChange" FROM "user" WHERE id = $1`, [admin.id])).rows[0];
  assert.equal(lockedCols.archived, false, "archived must stay false");
  assert.equal(lockedCols.lastPasswordChange, null, "lastPasswordChange must stay unset");
  console.log("ok - archived and lastPasswordChange rejected");

  const renamed = await updateUser(admin, { first_name: "Regression", last_name: "Renamed" });
  assert.equal(renamed.ok, true, `name update must still work (${JSON.stringify(renamed)})`);
  assert.equal((await stored(admin.id)).name, "Regression Renamed");
  console.log("ok - name update still works");

  const signUp = await auth.api.signUpEmail({
    body: { email: SIGNUP_EMAIL, password: `Zz-${crypto.randomBytes(6).toString("hex")}-Aa1!`, name: "Regression Signup", first_name: "Regression", last_name: "Signup", barangay: other.name },
    headers: new Headers({ "user-agent": UA }),
  });
  created.userIds.push(signUp.user.id);
  assert.equal((await stored(signUp.user.id)).barangay_id, other.id, "sign-up must still store the chosen barangay");
  console.log("ok - sign-up still stores barangay_id");
}

main()
  .then(() => {
    console.log("All user-field-lock regression checks passed.");
    process.exitCode = 0;
  })
  .catch((err) => {
    console.error("FAIL:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanup();
    } catch (err) {
      console.error("CLEANUP FAILED:", err.message);
      process.exitCode = 1;
    }
    await pool.end();
    process.exit(process.exitCode);
  });
