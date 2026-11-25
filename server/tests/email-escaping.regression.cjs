/**
 * Regression test: HTML injection in outgoing emails (audit P5-15, V-02, review N4).
 * 1) sanitizeMiddleware stripped tags and then decoded entities, so `&lt;img ...&gt;` (or `<<img>img ...>`)
 *    was stored as a live `<img ...>` tag.
 * 2) Templates interpolated names, module titles, the org footer and User-Agent tokens into HTML raw.
 *
 * Runs in-process (no API needed) with the mailer stubbed: every mail is captured, none is sent. Drives the
 * real send paths (provisioning and admin reset controllers, better-auth reset/verification callbacks,
 * securityService, accountNoticeService, the recertification cron) with hostile values and asserts each
 * captured HTML shows them as escaped text, never as markup.
 *
 * Fixtures are created per run and deleted by exact id; the org footer is restored. Refuses to run unless
 * the database is on loopback, and refuses LMS_db: point DB_DATABASE at a scratch database.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> node server/tests/email-escaping.regression.cjs
 */
const crypto = require("crypto");
const path = require("path");
const { spawnSync } = require("child_process");

// Stub outgoing mail before anything that captures the transporter is loaded.
const { transporter } = require("../utils/mailer");
const sent = [];
transporter.sendMail = async (mail) => {
  sent.push(mail);
  return { stubbed: true };
};

const pool = require("../config/db");
// Count sanitize-html calls made by the middleware (it reads the export once, at load).
const sanitizeHtmlPath = require.resolve("sanitize-html");
const realSanitizeHtml = require(sanitizeHtmlPath);
let sanitizeCalls = 0;
require.cache[sanitizeHtmlPath].exports = Object.assign((...args) => { sanitizeCalls++; return realSanitizeHtml(...args); }, realSanitizeHtml);
const sanitizeMiddleware = require("../middleware/sanitizeMiddleware");
require.cache[sanitizeHtmlPath].exports = realSanitizeHtml;
const { auth } = require("../utils/auth");
const { provisionAdmin } = require("../controllers/admin/user-management/provisionAdmin");
const { resetUserPassword } = require("../controllers/admin/user-management/resetUserPassword");
const securityService = require("../services/securityService");
const { sendAccountNotice } = require("../services/accountNoticeService");
const { runCertificateMaintenanceJob } = require("../utils/certificateExpiryCron");
const { getOTPEmail } = require("../utils/emailTemplates");

const RUN = `regress_esc_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;

const IMG = "<img src=x onerror=alert(1)>";
const IMG_ESCAPED = "&lt;img src=x onerror=alert(1)&gt;";
const ENTITY_LINK = "&lt;a href=https://example.com&gt;Click&lt;/a&gt;";
const ENTITY_LINK_ESCAPED = "&amp;lt;a href=https://example.com&amp;gt;Click&amp;lt;/a&amp;gt;";
const FOOTER = `Footer ${IMG}`;

const created = { userIds: [], modIds: [], certIds: [] };
let savedFooter;
let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

const LIVE_MARKUP = [/<img\b/i, /<a\s+href=https:\/\/example\.com/i, /<script\b/i];

// The HTML must not contain the hostile markup live, and must contain each expected escaped form.
function assertEscaped(html, expected) {
  for (const re of LIVE_MARKUP) {
    if (re.test(html)) throw new Error(`live markup ${re} in HTML: ${html.match(new RegExp(`.{0,60}${re.source}.{0,60}`, "is"))?.[0]}`);
  }
  for (const text of expected) {
    if (!html.includes(text)) throw new Error(`expected escaped text not found: ${text}`);
  }
}

function mailTo(email, subjectRe) {
  const matches = sent.filter((m) => m.to === email && (!subjectRe || subjectRe.test(m.subject)));
  if (matches.length === 0) throw new Error(`no captured mail to ${email}${subjectRe ? ` matching ${subjectRe}` : ""}`);
  return matches[matches.length - 1];
}

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

let counter = 0;
async function createUser(name) {
  const id = `${RUN}_${++counter}`;
  const email = `${id}@${EMAIL_DOMAIN}`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, 'resident', false, false, false, NOW(), NOW())`,
    [id, name, email]
  );
  created.userIds.push(id);
  // a credential account, so the admin reset path can set a password
  await pool.query(
    `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $2, 'x', NOW(), NOW())`,
    [`${id}_acct`, id]
  );
  return { id, name, email };
}

// Calls an Express handler in-process, with req.body passed through the global sanitizer like a real request.
function callHandler(handler, { body = {}, params = {}, user }) {
  return new Promise((resolve, reject) => {
    const req = { body, params, query: {}, headers: {}, user, ip: "127.0.0.1" };
    sanitizeMiddleware(req, {}, () => {});
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload, req }); return this; },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

function sanitize(body) {
  const req = { body, query: {}, params: {} };
  sanitizeMiddleware(req, {}, () => {});
  return req.body;
}

async function main() {
  await assertScratchDatabase();

  const { rows: footerRows } = await pool.query(`SELECT value FROM system_settings WHERE key = 'org_footer_text'`);
  savedFooter = footerRows[0]?.value ?? null;
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ('org_footer_text', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [FOOTER]
  );

  console.log("\nsanitizer (P5-15)");
  {
    const out = sanitize({
      subject: "&lt;img src=x onerror=alert(1)&gt;",
      nested: "<<img src=x>img src=x onerror=alert(1)>",
      doubled: "&amp;lt;img src=x onerror=alert(1)&amp;gt;",
      link: `${ENTITY_LINK} Admin`,
      amp: "Fire & Rescue",
      lt: "5 < 6 and 7 > 3",
      quote: `O'Brien "Jr"`,
    });
    for (const k of ["subject", "nested", "doubled", "link"]) {
      check(`entity/nested markup in "${k}" is not stored as a tag`, () => {
        if (/<\s*[a-z!/]/i.test(out[k])) throw new Error(`stored ${JSON.stringify(out[k])}`);
      });
    }
    check("plain '&' survives unescaped", () => { if (out.amp !== "Fire & Rescue") throw new Error(JSON.stringify(out.amp)); });
    check("plain '<' '>' survive unescaped", () => { if (out.lt !== "5 < 6 and 7 > 3") throw new Error(JSON.stringify(out.lt)); });
    check("quotes survive unescaped", () => { if (out.quote !== `O'Brien "Jr"`) throw new Error(JSON.stringify(out.quote)); });

    // Every pass is a full sanitize-html parse of a body up to 800 KB, so the pass count must stay bounded.
    let deep = IMG;
    for (let i = 0; i < 12; i++) deep = deep.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const countCalls = (value) => { sanitizeCalls = 0; const r = sanitize({ value }).value; return [sanitizeCalls, r]; };
    const [plainCalls] = countCalls("Fire & Rescue");
    const [deepCalls, deepOut] = countCalls(deep);
    check("plain text costs one sanitize pass", () => { if (plainCalls !== 1) throw new Error(`${plainCalls} passes`); });
    check("12x-encoded markup costs at most three passes and stores no tag", () => {
      if (deepCalls > 3) throw new Error(`${deepCalls} passes`);
      if (/<\s*[a-z!/]/i.test(deepOut)) throw new Error(JSON.stringify(deepOut));
    });
  }

  console.log("\nprovisioning credentials email (V-02)");
  {
    const email = `${RUN}_prov@${EMAIL_DOMAIN}`;
    const r = await callHandler(provisionAdmin, {
      body: { name: `${ENTITY_LINK} Admin`, email, role: "mdrrmo_admin" },
      user: { id: "regression-actor", role: "super_admin" },
    });
    const { rows } = await pool.query(`SELECT id, name FROM "user" WHERE email = $1`, [email]);
    if (rows[0]) created.userIds.push(rows[0].id);
    check("provisioning succeeded", () => { if (r.status !== 201 && r.status !== 200) throw new Error(`${r.status} ${JSON.stringify(r.body)}`); });
    check("stored admin name has no tag", () => { if (/<\s*[a-z/]/i.test(rows[0]?.name ?? "")) throw new Error(JSON.stringify(rows[0]?.name)); });
    check("credentials email shows no live markup", () => assertEscaped(mailTo(email).html, [`Footer ${IMG_ESCAPED}`]));
  }

  // Values as they already sit in the database (stored by the old sanitizer, Google sign-in, or SQL).
  const rawUser = await createUser(`${IMG} Raw`);
  const entityUser = await createUser(`${ENTITY_LINK} Entity`);

  console.log("\nadmin password reset email");
  {
    sent.length = 0;
    const r = await callHandler(resetUserPassword, { params: { id: rawUser.id }, user: { id: "regression-actor", role: "super_admin" } });
    check("admin reset handler ran", () => { if (r.status >= 500) throw new Error(`${r.status} ${JSON.stringify(r.body)}`); });
    check("admin reset email escapes name and footer", () => assertEscaped(mailTo(rawUser.email).html, [`${IMG_ESCAPED} Raw`, `Footer ${IMG_ESCAPED}`]));
  }

  console.log("\nbetter-auth callbacks: password reset, verification; OTP builder");
  {
    sent.length = 0;
    const token = `tok"><img src=x onerror=alert(1)>`;
    await auth.options.emailAndPassword.sendResetPassword({ user: entityUser, token });
    await auth.options.emailVerification.sendVerificationEmail({ user: rawUser, token });
    check("reset email escapes name and footer", () => assertEscaped(mailTo(entityUser.email, /Reset/).html, [`${ENTITY_LINK_ESCAPED} Entity`, `Footer ${IMG_ESCAPED}`]));
    check("reset link URL-encodes the token", () => {
      if (!mailTo(entityUser.email, /Reset/).html.includes(`token=${encodeURIComponent(token)}"`)) throw new Error("token not URL-encoded in href");
    });
    check("verification email escapes name and footer", () => assertEscaped(mailTo(rawUser.email, /Verify/).html, [`${IMG_ESCAPED} Raw`, `Footer ${IMG_ESCAPED}`]));
    check("verification link URL-encodes the token", () => {
      if (!mailTo(rawUser.email, /Verify/).html.includes(`token=${encodeURIComponent(token)}"`)) throw new Error("token not URL-encoded in href");
    });
    const otp = getOTPEmail(rawUser, "123456", { orgFooterText: FOOTER, supportEmail: "help@example.invalid" });
    check("OTP email escapes name and footer", () => assertEscaped(otp.html, [`${IMG_ESCAPED} Raw`, `Footer ${IMG_ESCAPED}`]));
  }

  console.log("\nsecurity alerts: password changed, recovered, new login");
  {
    sent.length = 0;
    await securityService.handlePasswordChangeAlert(rawUser);
    check("password-changed email escapes name and footer", () => assertEscaped(mailTo(rawUser.email, /Password Changed/).html, [`${IMG_ESCAPED} Raw`, `Footer ${IMG_ESCAPED}`]));

    await securityService.handlePasswordResetRecovery(entityUser.email);
    check("recovered email escapes name", () => assertEscaped(mailTo(entityUser.email, /Recovered/).html, [`${ENTITY_LINK_ESCAPED} Entity`]));

    const ua = `<img/src=x/onerror=alert(1)> Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36`;
    await pool.query(
      `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
       VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW(), NOW(), $3, $4, $5)`,
      [`${rawUser.id}_s1`, crypto.randomBytes(12).toString("hex"), `127.0.0.1"><img src=x onerror=alert(1)>`, ua, rawUser.id]
    );
    await securityService.handleNewDeviceLoginCheck(rawUser.email);
    check("new-login email escapes name, UA token and IP", () => assertEscaped(mailTo(rawUser.email, /New Login/).html, [`${IMG_ESCAPED} Raw`]));
  }

  console.log("\nnew-login device label (N4)");
  {
    const UAS = {
      iPhone: ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1", "Safari on iPhone/iPad"],
      iPad: ["Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1", "Chrome on iPhone/iPad"],
      Mac: ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15", "Safari on Mac"],
      Android: ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36", "Chrome on Android device"],
      Windows: ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "Edge on Windows PC"],
    };
    const { getNewDeviceLoginEmail } = require("../utils/emailTemplates");
    for (const [label, [ua, expected]] of Object.entries(UAS)) {
      const { html } = getNewDeviceLoginEmail({ name: "N", email: "n@example.invalid" }, { userAgent: ua, ipAddress: "127.0.0.1", createdAt: new Date() });
      check(`${label} UA is labelled "${expected}"`, () => {
        const shown = html.match(/Device\/Browser:<\/strong> ([^<]*)</)?.[1];
        if (shown !== expected) throw new Error(`shown ${JSON.stringify(shown)}`);
      });
    }
  }

  console.log("\naccount notices");
  {
    sent.length = 0;
    await sendAccountNotice(rawUser.id, "banned", { reason: IMG });
    check("account notice escapes name, reason and footer", () =>
      assertEscaped(mailTo(rawUser.email, /suspended/).html, [`${IMG_ESCAPED} Raw`, `Footer ${IMG_ESCAPED}`]));
  }

  console.log("\nrecertification reminder (P5-15)");
  {
    sent.length = 0;
    const { rows: [mod] } = await pool.query(
      `INSERT INTO module_data (modname, modcat) VALUES ($1, 'General') RETURNING mod_id`,
      [`${IMG} ${ENTITY_LINK} Earthquake`]
    );
    created.modIds.push(mod.mod_id);
    const { rows: [act] } = await pool.query(
      `INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, 'completed', 100) RETURNING modact_id`,
      [rawUser.id, mod.mod_id]
    );
    const { rows: [cert] } = await pool.query(
      `INSERT INTO certificates (user_id, modact_id, cert_rec, module_id, completion_date, verification_token, expires_at, status)
       VALUES ($1, $2, $3, $4, NOW(), $5, LOCALTIMESTAMP + INTERVAL '10 days', 'active') RETURNING cert_id`,
      [rawUser.id, act.modact_id, `CERT-${RUN}`, mod.mod_id, crypto.randomUUID()]
    );
    created.certIds.push(cert.cert_id);
    await runCertificateMaintenanceJob();
    check("recertification email escapes name and module title", () =>
      assertEscaped(mailTo(rawUser.email, /Recertification|Expiring/).html, [`${IMG_ESCAPED} Raw`, `${IMG_ESCAPED} ${ENTITY_LINK_ESCAPED} Earthquake`]));
  }

  console.log("\nFRONTEND_URL must be http(s) before it goes into href");
  {
    const script = `
      const t = require(${JSON.stringify(path.join(__dirname, "..", "utils", "emailTemplates"))});
      const u = { name: "N", email: "n@example.invalid" };
      const out = [];
      for (const build of [
        () => t.getResetPasswordEmail(u, "tok"),
        () => t.getVerificationEmail(u, "tok"),
        () => t.getAdminPasswordResetEmail(u, "P@ssw0rd!"),
        () => t.getRecertificationReminderEmail(u, { expires_at: new Date(), cert_id: 1 }, "M", 5),
      ]) {
        try { out.push(build().html); } catch (e) { out.push("THREW:" + e.message); }
      }
      process.stdout.write(JSON.stringify(out));`;
    const child = spawnSync(process.execPath, ["-e", script], {
      env: { ...process.env, FRONTEND_URL: "javascript:alert(1)//" },
      encoding: "utf8",
    });
    const outputs = JSON.parse(child.stdout || "[]");
    check("four template outputs produced", () => { if (outputs.length !== 4) throw new Error(child.stderr); });
    outputs.forEach((html, i) => {
      check(`template ${i + 1} puts no javascript: URL in href`, () => {
        if (/href="javascript:/i.test(html)) throw new Error("javascript: href present");
      });
    });
  }
}

async function cleanup() {
  try {
    if (created.certIds.length) await pool.query(`DELETE FROM certificates WHERE cert_id = ANY($1)`, [created.certIds]);
    if (created.userIds.length) {
      await pool.query(`DELETE FROM user_notifications WHERE user_id = ANY($1)`, [created.userIds]).catch(() => {});
      await pool.query(`DELETE FROM module_activity WHERE user_id = ANY($1)`, [created.userIds]);
      await pool.query(`DELETE FROM account WHERE "userId" = ANY($1)`, [created.userIds]);
    }
    if (created.modIds.length) await pool.query(`DELETE FROM module_data WHERE mod_id = ANY($1)`, [created.modIds]);
    if (created.userIds.length) await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
    if (savedFooter === null) await pool.query(`DELETE FROM system_settings WHERE key = 'org_footer_text'`);
    else if (savedFooter !== undefined) await pool.query(`UPDATE system_settings SET value = $1 WHERE key = 'org_footer_text'`, [savedFooter]);
  } catch (err) {
    console.log(`cleanup error: ${err.message}`);
  }
}

main()
  .catch((err) => {
    failed++;
    console.log(`ERROR ${err.stack}`);
  })
  .finally(async () => {
    await cleanup();
    console.log(`\n${passed} passed, ${failed} failed`);
    await pool.end().catch(() => {});
    process.exit(failed ? 1 : 0);
  });
