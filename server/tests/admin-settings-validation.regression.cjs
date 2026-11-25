/**
 * Regression test (validation audit M10, TECH_DEBT item 6): maintenance and broadcast settings.
 *
 * Maintenance: PATCH /api/admin/settings/maintenance stored `enabled ? 'true' : 'false'`, so the
 * string "false" (truthy) turned maintenance ON. A no-body fix (P5-09) then refused every
 * non-boolean, "false" and "true" included. Spec: true / "true" turn it on, false / "false" turn
 * it off, anything else is a 400 that changes nothing. Every reader of the stored value must treat
 * only "true" as on: a resident request gets a 503 only then, whatever else is stored.
 *
 * Broadcast: PATCH /api/admin/settings/broadcast stored any broadcast_severity, any message length
 * and coerced broadcast_active with `? 'true' : 'false'` ("false" became active). Spec: severity is
 * one of info / warning / critical (the panel's radios and the banner's styles), the message is a
 * string of at most 500 characters, active is a boolean (the panel sends `=== "true"`). A bad
 * field is a 400 and nothing is written, the other fields of the same request included.
 *
 * Users and sessions are seeded in SQL; settings are restored and fixtures removed in `finally`.
 * Refuses to run unless the database is on loopback.
 *
 * Run from the repo root:  node server/tests/admin-settings-validation.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "admin-settings-regression/1.0";
const RUN = `regress_as_${crypto.randomBytes(4).toString("hex")}`;
const KEYS = ["maintenance_mode", "broadcast_active", "broadcast_message", "broadcast_severity"];

const created = { userIds: [] };

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
  const headers = { Accept: "application/json", "User-Agent": UA };
  if (user) headers.Cookie = user.cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, text, body: json };
}

async function snapshot() {
  const { rows } = await pool.query("SELECT key, value FROM system_settings WHERE key = ANY($1)", [KEYS]);
  return Object.fromEntries(KEYS.map((k) => [k, rows.find((r) => r.key === k)?.value ?? null]));
}

async function store(key, value) {
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
}

async function cleanup(original) {
  for (const key of KEYS) {
    if (original[key] === null) await pool.query("DELETE FROM system_settings WHERE key = $1", [key]);
    else await store(key, original[key]);
  }
  const { userIds } = created;
  await pool.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
  await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [userIds]);
  await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds]);
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE id = ANY($1)`, [userIds]);
  console.log("cleanup counts:", JSON.stringify({ users: rows[0].n }));
  assert.equal(rows[0].n, 0, "cleanup left fixture rows behind");
}

async function main() {
  await assertLocalDatabase();
  const original = await snapshot();
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

  try {
    const admin = await createUser("sysadmin", "system_admin");
    const resident = await createUser("resident", "resident");

    const maintenance = (body) => call(admin, "PATCH", "/api/admin/settings/maintenance", body);
    const broadcast = (body) => call(admin, "PATCH", "/api/admin/settings/broadcast", body);
    // Any resident route behind the maintenance middleware
    const residentStatus = async () => (await call(resident, "GET", "/api/users/me/settings")).status;

    // Start from a known state: off, through the API so the middleware cache is cleared
    let res = await maintenance({ enabled: false });
    assert.equal(res.status, 200, `setup: ${res.text}`);

    // --- maintenance: write side
    for (const [enabled, stored, residentCode] of [
      ["true", "true", 503],
      ["false", "false", 200],
      [true, "true", 503],
      [false, "false", 200],
    ]) {
      await check(`maintenance ${JSON.stringify(enabled)} saves "${stored}" and a resident request gets ${residentCode}`, async () => {
        const r = await maintenance({ enabled });
        assert.equal(r.status, 200, r.text);
        assert.equal((await snapshot()).maintenance_mode, stored);
        assert.equal(await residentStatus(), residentCode);
      });
    }

    // Grouped by starting state: the whole suite shares the 1000-per-15-minutes loopback limiter
    for (const before of ["false", "true"]) {
      await maintenance({ enabled: before === "true" });
      for (const enabled of [undefined, null, 1, 0, "yes", "TRUE", "", "1", {}, [], [true]]) {
        await check(`maintenance ${JSON.stringify(enabled) ?? "missing"} is a 400 and leaves "${before}"`, async () => {
          const r = await maintenance(enabled === undefined ? {} : { enabled });
          assert.equal(r.status, 400, r.text);
          assert.equal(r.body?.message, "Send enabled: true or false.", r.text);
          assert.equal((await snapshot()).maintenance_mode, before);
        });
      }
    }

    // --- maintenance: read side. A valid PATCH clears the middleware cache; the stored value is
    // overwritten right after, so the next resident request reads it from the DB.
    for (const [stored, on] of [["false", false], ["0", false], ["", false], ["1", false], ["TRUE", false], ["yes", false], ["true", true]]) {
      await check(`stored maintenance_mode ${JSON.stringify(stored)} reads as ${on ? "ON" : "OFF"} (middleware, /public/status)`, async () => {
        await maintenance({ enabled: false });
        await store("maintenance_mode", stored);
        assert.equal(await residentStatus(), on ? 503 : 200, "resident request");
        const status = await call(null, "GET", "/api/public/status");
        assert.equal(status.status, on ? 503 : 200, status.text);
        assert.equal(status.body?.maintenance, on, status.text);
      });
    }
    await maintenance({ enabled: false });

    // --- broadcast
    const valid = { broadcast_message: "Drill at 9 AM", broadcast_active: false, broadcast_severity: "info" };
    res = await broadcast(valid);
    assert.equal(res.status, 200, `setup: ${res.text}`);

    const bad = [
      ["severity 'danger'", { broadcast_severity: "danger" }],
      ["severity 'Critical'", { broadcast_severity: "Critical" }],
      ["severity ''", { broadcast_severity: "" }],
      ["severity null", { broadcast_severity: null }],
      ["severity 2", { broadcast_severity: 2 }],
      ["message of 501 characters", { broadcast_message: "a".repeat(501) }],
      ["message of 100000 characters", { broadcast_message: "a".repeat(100000) }],
      ["message null", { broadcast_message: null }],
      ["message 123", { broadcast_message: 123 }],
      ["message object", { broadcast_message: { a: 1 } }],
      ["active 'false'", { broadcast_active: "false" }],
      ["active 'true'", { broadcast_active: "true" }],
      ["active 1", { broadcast_active: 1 }],
      ["active null", { broadcast_active: null }],
      ["valid message and active with a bad severity", { broadcast_message: "Changed", broadcast_active: true, broadcast_severity: "danger" }],
      ["valid severity with an over-long message", { broadcast_message: "b".repeat(501), broadcast_severity: "critical" }],
      ["valid message with active 'false'", { broadcast_message: "Changed", broadcast_active: "false" }],
    ];
    for (const [label, body] of bad) {
      await check(`broadcast ${label} is a 400 and writes nothing`, async () => {
        const before = await snapshot();
        const r = await broadcast(body);
        assert.equal(r.status, 400, r.text);
        assert.equal(typeof r.body?.message, "string", r.text);
        assert.notEqual(r.body.message, "Failed to update broadcast settings.", r.text);
        assert.deepEqual(await snapshot(), before);
      });
    }

    await check("broadcast with no fields is still a 400 'Nothing to update.'", async () => {
      const r = await broadcast({});
      assert.equal(r.status, 400, r.text);
      assert.equal(r.body?.message, "Nothing to update.", r.text);
    });

    for (const [label, body, expect] of [
      ["the panel's full save (critical, active)", { broadcast_message: "Typhoon signal 3", broadcast_active: true, broadcast_severity: "critical" },
        { broadcast_message: "Typhoon signal 3", broadcast_active: "true", broadcast_severity: "critical" }],
      ["warning, inactive, empty message", { broadcast_message: "", broadcast_active: false, broadcast_severity: "warning" },
        { broadcast_message: "", broadcast_active: "false", broadcast_severity: "warning" }],
      ["a 500-character message", { broadcast_message: "m".repeat(500), broadcast_active: true, broadcast_severity: "info" },
        { broadcast_message: "m".repeat(500), broadcast_active: "true", broadcast_severity: "info" }],
      ["severity only", { broadcast_severity: "warning" }, { broadcast_severity: "warning" }],
    ]) {
      await check(`broadcast ${label} saves`, async () => {
        const r = await broadcast(body);
        assert.equal(r.status, 200, r.text);
        const now = await snapshot();
        for (const [k, v] of Object.entries(expect)) assert.equal(now[k], v, k);
      });
    }

    await check("public broadcast reflects the last valid save", async () => {
      const r = await call(null, "GET", "/api/public/broadcast");
      assert.equal(r.status, 200, r.text);
      assert.equal(r.body.severity, "warning");
      assert.equal(r.body.active, true);
    });

    // A legacy bad severity in the DB: the public read must not fail (the banner falls back to warning)
    await check("a stored severity 'danger' is still served by /public/broadcast with a 200", async () => {
      await store("broadcast_severity", "danger");
      await broadcast({ broadcast_message: "m".repeat(500) }); // valid save clears the 30 s cache
      const r = await call(null, "GET", "/api/public/broadcast");
      assert.equal(r.status, 200, r.text);
      console.log(`  (stored 'danger' is served as severity ${JSON.stringify(r.body.severity)})`);
    });
  } finally {
    await cleanup(original);
    await pool.end();
  }

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):\n  - ${failures.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    console.log("\nall checks passed");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
