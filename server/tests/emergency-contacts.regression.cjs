/**
 * Regression test: admin-editable emergency hotlines (docs/specs/emergency-contacts.md).
 *
 * Sends real HTTP requests to a RUNNING LOCAL server and asserts that:
 *   - GET /api/public/emergency-contacts returns active rows only, in order, briefly cacheable;
 *     sample rows have tel null and every other tel is the shown phone without spaces and dashes
 *   - GET/PUT /api/admin/emergency-contacts admit only super, system, mdrrmo and head_mdrrmo admins
 *   - every invalid body is refused with 400, a per-field error, and no change
 *   - a saved change writes exactly one activity_log entry, a no-op save writes none
 *   - GET -> edit -> PUT with that version succeeds; a stale version gets 409
 *   - the public list reflects a save at once, and signed-in clients get an SSE event
 *
 * Fixtures (one user and session per role) are seeded from server/.env and deleted by id. The
 * contact list is restored to what it was at the start. Refuses to run unless the database is on
 * loopback, and refuses LMS_db: point DB_DATABASE and TEST_BASE_URL at a scratch database/API.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> TEST_BASE_URL=http://localhost:<port> node server/tests/emergency-contacts.regression.cjs
 */
const crypto = require("crypto");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "emergency-contacts-regression/1.0";
const RUN = `regress_ec_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;
const ADMIN_PATH = "/api/admin/emergency-contacts";
const PUBLIC_PATH = "/api/public/emergency-contacts";

const created = { userIds: [] };

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
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, body: await res.json().catch(() => null) };
}

// Strip the read-only fields an admin GET returns, leaving what a PUT accepts.
const editable = ({ id, agency, label, phone, is_sample, active }) => ({ id, agency, label, phone, is_sample, active });

async function logCount(userId) {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM activity_log WHERE user_id = $1", [userId]);
  return rows[0].n;
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

async function cleanup(admin, original) {
  if (original) {
    const now = await call(admin, "GET", ADMIN_PATH);
    if (now.status === 200) {
      // The tests replaced the original rows, so restore their content as new rows.
      const contacts = original.map((c) => ({ ...c, id: undefined }));
      const res = await call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts });
      console.log(`restored original contacts: ${res.status}`);
      assert.equal(res.status, 200, "could not restore the original contacts");
    }
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [created.userIds]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
    const { rows: t } = await client.query("SELECT to_regclass('public.emergency_contacts') AS t");
    if (t[0].t) {
      await client.query(`UPDATE emergency_contacts SET updated_by = NULL WHERE updated_by = ANY($1)`, [created.userIds]);
    }
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE email LIKE $1`, [`%@${EMAIL_DOMAIN}`]);
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.equal(rows[0].n, 0, "cleanup left fixture rows behind");
}

async function main() {
  await assertScratchDatabase();
  const sessions = {};
  let admin = null;
  let original = null;
  let start = null;

  // Known list for the shape checks: 911, a dashed non-sample line, a sample, an inactive row.
  const known = [
    { agency: "National Emergency", label: "Emergency hotline", phone: "911", is_sample: false, active: true },
    { agency: "Regression Agency", label: "Mobile", phone: "+63 917-123-4567", is_sample: false, active: true },
    { agency: "Regression Agency", label: "Sample line", phone: "0987 654 3210", is_sample: true, active: true },
    { agency: "Regression Agency", label: "Retired line", phone: "0918 000 0000", is_sample: false, active: false },
  ];

  const putKnown = async () => {
    const now = await call(admin, "GET", ADMIN_PATH);
    assert.equal(now.status, 200, JSON.stringify(now.body));
    const res = await call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts: known });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body;
  };

  try {
    for (const role of ["super_admin", "system_admin", "mdrrmo_admin", "head_mdrrmo_admin", "barangay_admin", "resident"]) {
      sessions[role] = await createSession(role);
    }
    admin = sessions.mdrrmo_admin;
    start = await call(admin, "GET", ADMIN_PATH);
    original = start.status === 200 ? start.body.contacts.map(editable) : null;

    await check("admin GET returns an integer version and every row", async () => {
      assert.equal(start.status, 200, JSON.stringify(start.body));
      assert.ok(Number.isInteger(start.body.version) && start.body.version >= 1, `version ${start.body.version}`);
      assert.ok(Array.isArray(start.body.contacts) && start.body.contacts.length >= 1);
      for (const c of start.body.contacts) {
        for (const key of ["id", "agency", "label", "phone", "tel", "is_sample", "active", "updated_at"]) {
          assert.ok(key in c, `missing ${key}`);
        }
      }
    });

    await check("public GET reflects a save at once: active rows only, in order", async () => {
      await putKnown();
      const res = await call(null, "GET", PUBLIC_PATH);
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.success, true);
      assert.deepEqual(
        res.body.contacts.map((c) => c.label),
        ["Emergency hotline", "Mobile", "Sample line"]
      );
      for (const c of res.body.contacts) {
        assert.deepEqual(Object.keys(c).sort(), ["agency", "id", "is_sample", "label", "phone", "tel"]);
      }
    });

    await check("public GET: sample rows have no tel; other tels are the phone without spaces and dashes", async () => {
      const res = await call(null, "GET", PUBLIC_PATH);
      const byLabel = Object.fromEntries(res.body.contacts.map((c) => [c.label, c]));
      assert.equal(byLabel["Sample line"].is_sample, true);
      assert.equal(byLabel["Sample line"].tel, null);
      assert.equal(byLabel["Emergency hotline"].tel, "911");
      assert.equal(byLabel.Mobile.phone, "+63 917-123-4567");
      assert.equal(byLabel.Mobile.tel, "+639171234567");
      for (const c of res.body.contacts.filter((x) => !x.is_sample)) {
        assert.equal(c.tel, c.phone.replace(/[ -]/g, ""));
      }
    });

    await check("public GET is briefly cacheable", async () => {
      const res = await call(null, "GET", PUBLIC_PATH);
      const cc = res.headers.get("cache-control") || "";
      assert.match(cc, /public/);
      assert.match(cc, /max-age=30\b/);
    });

    await check("anonymous admin GET and PUT get 401", async () => {
      assert.equal((await call(null, "GET", ADMIN_PATH)).status, 401);
      assert.equal((await call(null, "PUT", ADMIN_PATH, { version: 1, contacts: known })).status, 401);
    });

    for (const role of ["resident", "barangay_admin"]) {
      await check(`${role} gets 403 on admin GET and PUT`, async () => {
        assert.equal((await call(sessions[role], "GET", ADMIN_PATH)).status, 403);
        const now = await call(admin, "GET", ADMIN_PATH);
        const res = await call(sessions[role], "PUT", ADMIN_PATH, { version: now.body.version, contacts: known });
        assert.equal(res.status, 403);
        const after = await call(admin, "GET", ADMIN_PATH);
        assert.equal(after.body.version, now.body.version, "a refused PUT changed the version");
      });
    }

    for (const role of ["super_admin", "system_admin", "mdrrmo_admin", "head_mdrrmo_admin"]) {
      await check(`${role} can GET and PUT`, async () => {
        const now = await call(sessions[role], "GET", ADMIN_PATH);
        assert.equal(now.status, 200, JSON.stringify(now.body));
        const contacts = now.body.contacts.map(editable);
        contacts[1] = { ...contacts[1], label: `Mobile ${role}` };
        const res = await call(sessions[role], "PUT", ADMIN_PATH, { version: now.body.version, contacts });
        assert.equal(res.status, 200, JSON.stringify(res.body));
      });
    }

    await check("a saved change writes one activity_log entry; a no-op save writes none", async () => {
      const now = await call(admin, "GET", ADMIN_PATH);
      const contacts = now.body.contacts.map(editable);
      const before = await logCount(admin.id);
      contacts[1] = { ...contacts[1], phone: "+63 917-765-4321" };
      contacts[3] = { ...contacts[3], active: true };
      const saved = await call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts });
      assert.equal(saved.status, 200, JSON.stringify(saved.body));
      assert.equal(await logCount(admin.id), before + 1);
      const { rows } = await pool.query(
        "SELECT act_log FROM activity_log WHERE user_id = $1 ORDER BY act_id DESC LIMIT 1",
        [admin.id]
      );
      assert.match(rows[0].act_log, /^Updated emergency contacts: /);
      assert.match(rows[0].act_log, /Regression Agency\/Mobile/);

      const noop = await call(admin, "PUT", ADMIN_PATH, { version: saved.body.version, contacts });
      assert.equal(noop.status, 200, JSON.stringify(noop.body));
      assert.equal(noop.body.version, saved.body.version, "a no-op save bumped the version");
      assert.equal(await logCount(admin.id), before + 1);
    });

    await check("the activity_log summary fits the 500-char column", async () => {
      const now = await call(admin, "GET", ADMIN_PATH);
      const contacts = Array.from({ length: 15 }, (_, i) => ({
        agency: `${"A".repeat(70)} ${i}`,
        label: `${"L".repeat(70)} ${i}`,
        phone: "0918 111 2222",
        is_sample: false,
        active: true,
      }));
      const res = await call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const { rows } = await pool.query(
        "SELECT act_log FROM activity_log WHERE user_id = $1 ORDER BY act_id DESC LIMIT 1",
        [admin.id]
      );
      assert.ok(rows[0].act_log.length <= 500, `length ${rows[0].act_log.length}`);
      await putKnown();
    });

    await check("GET -> edit -> PUT with that version succeeds and bumps it by one", async () => {
      const now = await call(admin, "GET", ADMIN_PATH);
      const contacts = now.body.contacts.map(editable);
      contacts[0] = { ...contacts[0], label: "Emergency (edited)" };
      const res = await call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      assert.equal(res.body.version, now.body.version + 1);
      const after = await call(admin, "GET", ADMIN_PATH);
      assert.equal(after.body.version, now.body.version + 1);
      assert.equal(after.body.contacts[0].label, "Emergency (edited)");
    });

    await check("a PUT with a stale version gets 409 and changes nothing", async () => {
      const now = await call(admin, "GET", ADMIN_PATH);
      const contacts = now.body.contacts.map(editable);
      const first = await call(admin, "PUT", ADMIN_PATH, {
        version: now.body.version,
        contacts: contacts.map((c, i) => (i === 0 ? { ...c, label: "First writer" } : c)),
      });
      assert.equal(first.status, 200, JSON.stringify(first.body));
      const stale = await call(admin, "PUT", ADMIN_PATH, {
        version: now.body.version,
        contacts: contacts.map((c, i) => (i === 0 ? { ...c, label: "Second writer" } : c)),
      });
      assert.equal(stale.status, 409, JSON.stringify(stale.body));
      assert.equal(stale.body.version, first.body.version);
      const after = await call(admin, "GET", ADMIN_PATH);
      assert.equal(after.body.contacts[0].label, "First writer");
      assert.equal(after.body.version, first.body.version);
    });

    await check("two simultaneous PUTs with one version: one 200, one 409", async () => {
      const now = await call(admin, "GET", ADMIN_PATH);
      const contacts = now.body.contacts.map(editable);
      const [a, b] = await Promise.all([
        call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts: contacts.map((c, i) => (i === 0 ? { ...c, label: "Race A" } : c)) }),
        call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts: contacts.map((c, i) => (i === 0 ? { ...c, label: "Race B" } : c)) }),
      ]);
      assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    });

    await check("removing a row and adding a row in one save", async () => {
      await putKnown();
      const now = await call(admin, "GET", ADMIN_PATH);
      const contacts = now.body.contacts.map(editable).filter((c) => c.label !== "Retired line");
      contacts.push({ agency: "Regression Agency", label: "New line", phone: "0919 222 3333", is_sample: false, active: true });
      const res = await call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const after = await call(admin, "GET", ADMIN_PATH);
      assert.deepEqual(
        after.body.contacts.map((c) => c.label),
        ["Emergency hotline", "Mobile", "Sample line", "New line"]
      );
      assert.ok(Number.isInteger(after.body.contacts[3].id));
    });

    await check("reordering is the array order", async () => {
      const now = await call(admin, "GET", ADMIN_PATH);
      const contacts = now.body.contacts.map(editable).reverse();
      const res = await call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const pub = await call(null, "GET", PUBLIC_PATH);
      assert.deepEqual(pub.body.contacts.map((c) => c.label), ["New line", "Sample line", "Mobile", "Emergency hotline"]);
    });

    await check("signed-in clients get an EMERGENCY_CONTACTS_UPDATED event after a save", async () => {
      const listener = waitForEvent(sessions.resident, "EMERGENCY_CONTACTS_UPDATED", 4000);
      await listener.connected;
      await putKnown();
      assert.equal(await listener.result, true, "no SSE event within 4s");
    });

    // ---- validation: each case is refused with 400 and the named field, and changes nothing ----
    await putKnown();
    const base = (await call(admin, "GET", ADMIN_PATH)).body;
    const baseRows = base.contacts.map(editable);
    const withRow = (patch, index = 1) => baseRows.map((c, i) => (i === index ? { ...c, ...patch } : c));
    const row = (patch) => ({ agency: "Regression Agency", label: "Line", phone: "0918 111 2222", is_sample: false, active: true, ...patch });

    const invalid = [
      ["empty agency", { contacts: withRow({ agency: "" }) }, "agency"],
      ["blank agency (spaces only)", { contacts: withRow({ agency: "   " }) }, "agency"],
      ["81-char agency", { contacts: withRow({ agency: "A".repeat(81) }) }, "agency"],
      ["81 astral characters in agency", { contacts: withRow({ agency: "\u{1D538}".repeat(81) }) }, "agency"],
      ["empty label", { contacts: withRow({ label: "" }) }, "label"],
      ["newline in label", { contacts: withRow({ label: "Line\nTwo" }) }, "label"],
      ["NUL in agency", { contacts: withRow({ agency: "Agency\u0000" }) }, "agency"],
      ["letters in phone", { contacts: withRow({ phone: "0917abc1234" }) }, "phone"],
      ["comma (pause) in phone", { contacts: withRow({ phone: "0917,1234567" }) }, "phone"],
      ["semicolon (wait) in phone", { contacts: withRow({ phone: "0917;1234567" }) }, "phone"],
      ["# in phone", { contacts: withRow({ phone: "#911" }) }, "phone"],
      ["parentheses in phone", { contacts: withRow({ phone: "(045) 900-0199" }) }, "phone"],
      ["2-digit phone", { contacts: withRow({ phone: "12" }) }, "phone"],
      ["16-digit phone", { contacts: withRow({ phone: "1234 5678 9012 3456" }) }, "phone"],
      ["phone ending in a dash", { contacts: withRow({ phone: "0918-" }) }, "phone"],
      ["number phone", { contacts: withRow({ phone: 911 }) }, "phone"],
      ["string is_sample", { contacts: withRow({ is_sample: "true" }) }, "is_sample"],
      ["number active", { contacts: withRow({ active: 1 }) }, "active"],
      ["missing active", { contacts: withRow({ active: undefined }) }, "active"],
      ["unknown field", { contacts: withRow({ tel: "911" }) }, "tel"],
      ["string id", { contacts: withRow({ id: String(baseRows[1].id) }) }, "id"],
      ["negative id", { contacts: withRow({ id: -1 }) }, "id"],
      ["duplicate id", { contacts: withRow({ id: baseRows[0].id }) }, "id"],
      ["id that doesn't exist", { contacts: withRow({ id: 2147483000 }) }, "id"],
      ["no rows", { contacts: [] }, "contacts"],
      ["16 rows", { contacts: Array.from({ length: 16 }, (_, i) => row({ label: `Line ${i}` })) }, "contacts"],
      ["every row inactive", { contacts: baseRows.map((c) => ({ ...c, active: false })) }, "contacts"],
      ["contacts not an array", { contacts: { 0: baseRows[0] } }, "contacts"],
      ["row not an object", { contacts: [...baseRows, "911"] }, "contacts"],
      ["missing version", { version: undefined, contacts: baseRows }, "version"],
      ["string version", { version: String(base.version), contacts: baseRows }, "version"],
      ["fractional version", { version: base.version + 0.5, contacts: baseRows }, "version"],
      ["unknown top-level field", { contacts: baseRows, extra: true }, "extra"],
    ];

    for (const [name, patch, field] of invalid) {
      await check(`400 for ${name}`, async () => {
        const body = { version: base.version, ...patch };
        if ("version" in patch && patch.version === undefined) delete body.version;
        const res = await call(admin, "PUT", ADMIN_PATH, body);
        assert.equal(res.status, 400, `${res.status} ${JSON.stringify(res.body)}`);
        assert.equal(res.body.success, false);
        assert.ok(Array.isArray(res.body.errors), "errors[] missing");
        assert.ok(
          res.body.errors.some((e) => e.field === field),
          `no error for ${field}: ${JSON.stringify(res.body.errors)}`
        );
        const after = await call(admin, "GET", ADMIN_PATH);
        assert.equal(after.body.version, base.version, "a refused PUT changed the version");
      });
    }

    await check("80 astral characters in agency is accepted (matches Postgres char_length)", async () => {
      const now = await call(admin, "GET", ADMIN_PATH);
      const contacts = now.body.contacts.map(editable);
      contacts[1] = { ...contacts[1], agency: "\u{1D538}".repeat(80) };
      const res = await call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts });
      assert.equal(res.status, 200, JSON.stringify(res.body));
    });

    await check("agency, label and phone are trimmed before saving", async () => {
      const now = await call(admin, "GET", ADMIN_PATH);
      const contacts = now.body.contacts.map(editable);
      contacts[1] = { ...contacts[1], agency: "  Trim Agency ", label: " Trim ", phone: " 0918 333 4444 " };
      const res = await call(admin, "PUT", ADMIN_PATH, { version: now.body.version, contacts });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      const after = await call(admin, "GET", ADMIN_PATH);
      const saved = after.body.contacts[1];
      assert.deepEqual([saved.agency, saved.label, saved.phone, saved.tel], ["Trim Agency", "Trim", "0918 333 4444", "09183334444"]);
    });
  } finally {
    await cleanup(admin, original);
    await pool.end();
  }

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
