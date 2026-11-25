/**
 * Regression test: system name, org footer and support email in every outgoing email
 * (docs/specs/branding.md; audit P3-02, P3-03, P5-11, P3-04).
 *
 * Runs in-process (no API needed) with the mailer stubbed: every mail is captured, none is sent. Drives the
 * real send paths (better-auth reset/verification callbacks, admin reset and provisioning controllers,
 * securityService, accountNoticeService, the recertification cron) and the OTP builder, and asserts:
 *   - the header and the name-bearing body text show the stored system name, HTML-escaped
 *   - reset/verification subjects carry the name; no mail still says "DRRM Bacolor"
 *   - From is always EMAIL_USER (display name = system name), Reply-To is the support email when set
 *   - the org footer is on every mail, including new login, recovered and the recert reminder
 *   - with no support email there is no Reply-To; a stored name with CR/LF or a bidi override falls back
 *     to the default
 *
 * Fixtures are deleted by exact id; the branding and organization rows are restored. Refuses non-loopback
 * databases and LMS_db.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> node server/tests/branding-email.regression.cjs
 */
const crypto = require("crypto");

// Stub outgoing mail before anything that captures the transporter is loaded.
const { transporter } = require("../utils/mailer");
const sent = [];
transporter.sendMail = async (mail) => {
  sent.push(mail);
  return { stubbed: true };
};

const pool = require("../config/db");
const sanitizeMiddleware = require("../middleware/sanitizeMiddleware");
const { auth } = require("../utils/auth");
const { provisionAdmin } = require("../controllers/admin/user-management/provisionAdmin");
const { resetUserPassword } = require("../controllers/admin/user-management/resetUserPassword");
const securityService = require("../services/securityService");
const { sendAccountNotice } = require("../services/accountNoticeService");
const { runCertificateMaintenanceJob } = require("../utils/certificateExpiryCron");
const { getOTPEmail } = require("../utils/emailTemplates");
const { getOrgSettings } = require("../utils/settings");

const RUN = `regress_bre_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;
const SETTING_KEYS = ["system_name", "support_email", "org_footer_text"];

// A stored value as an old version, SQL or a restore could have left it: raw markup and quotes
const NAME = `Brand <b>&"Q</b> LMS`;
const NAME_ESCAPED = "Brand &lt;b&gt;&amp;&quot;Q&lt;/b&gt; LMS";
const FOOTER = `FOOTER-${RUN}`;
const SUPPORT = "help@example.org";
const EMAIL_USER = process.env.EMAIL_USER;

const created = { userIds: [], modIds: [], certIds: [] };
let savedRows = null;
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

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

async function putSetting(key, value) {
  if (value === null) {
    await pool.query("DELETE FROM system_settings WHERE key = $1", [key]);
    return;
  }
  await pool.query(
    `INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
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
  await pool.query(
    `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $2, 'x', NOW(), NOW())`,
    [`${id}_acct`, id]
  );
  return { id, name, email };
}

function callHandler(handler, { body = {}, params = {}, user }) {
  return new Promise((resolve, reject) => {
    const req = { body, params, query: {}, headers: {}, user, ip: "127.0.0.1" };
    sanitizeMiddleware(req, {}, () => {});
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

function mailTo(email, subjectRe) {
  const matches = sent.filter((m) => m.to === email && (!subjectRe || subjectRe.test(m.subject)));
  if (matches.length === 0) throw new Error(`no captured mail to ${email}${subjectRe ? ` matching ${subjectRe}` : ""}`);
  return matches[matches.length - 1];
}

// The checks every branded mail must pass
function assertBranded(label, mail, { replyTo = SUPPORT, nameInBody = true } = {}) {
  check(`${label}: From is EMAIL_USER with the system name as display name`, () => {
    if (typeof mail.from !== "object" || mail.from.address !== EMAIL_USER) throw new Error(`from ${JSON.stringify(mail.from)}`);
    if (!String(mail.from.name).startsWith(NAME)) throw new Error(`display name ${JSON.stringify(mail.from.name)}`);
  });
  check(`${label}: Reply-To is ${replyTo ? "the support email" : "absent"}`, () => {
    if ((mail.replyTo ?? null) !== replyTo) throw new Error(`replyTo ${JSON.stringify(mail.replyTo)}`);
  });
  check(`${label}: header shows the escaped name, no raw markup`, () => {
    const header = mail.html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "";
    if (!header.includes(NAME_ESCAPED)) throw new Error(`header ${JSON.stringify(header)}`);
    if (/<b>/.test(mail.html)) throw new Error("raw <b> in HTML");
  });
  if (nameInBody) {
    check(`${label}: body names the system (escaped)`, () => {
      const body = mail.html.split("<!-- Content -->")[1] ?? "";
      if (!body.includes(NAME_ESCAPED)) throw new Error("name not in body");
    });
  }
  check(`${label}: org footer present`, () => {
    if (!mail.html.includes(FOOTER)) throw new Error("footer missing");
  });
  check(`${label}: no hardcoded "DRRM Bacolor"`, () => {
    const text = `${mail.subject} ${mail.html} ${JSON.stringify(mail.from)}`;
    if (/DRRM\s*(<[^>]+>\s*)?Bacolor/.test(text)) throw new Error("still says DRRM Bacolor");
  });
}

async function main() {
  await assertScratchDatabase();
  if (!EMAIL_USER) throw new Error("EMAIL_USER must be set (server/.env) for the From check");
  const { rows } = await pool.query("SELECT key, value FROM system_settings WHERE key = ANY($1)", [SETTING_KEYS]);
  savedRows = rows;
  await putSetting("system_name", NAME);
  await putSetting("org_footer_text", FOOTER);
  await putSetting("support_email", SUPPORT);

  const user = await createUser("Branding Learner");

  console.log("\nbetter-auth callbacks: verification, password reset");
  sent.length = 0;
  await auth.options.emailVerification.sendVerificationEmail({ user, token: "tok" });
  await auth.options.emailAndPassword.sendResetPassword({ user, token: "tok" });
  const verify = mailTo(user.email, /Verify/);
  const reset = mailTo(user.email, /Reset/);
  assertBranded("verification", verify);
  assertBranded("reset", reset);
  check("verification subject carries the name", () => { if (verify.subject !== `Verify Your Email Address - ${NAME}`) throw new Error(verify.subject); });
  check("reset subject carries the name", () => { if (reset.subject !== `Reset Your Password - ${NAME}`) throw new Error(reset.subject); });
  check("verification greets with the escaped name", () => { if (!verify.html.includes(`Welcome to ${NAME_ESCAPED},`)) throw new Error("no greeting"); });

  console.log("\nOTP builder with getOrgSettings()");
  const org = await getOrgSettings();
  check("getOrgSettings returns the stored system name", () => { if (org.systemName !== NAME) throw new Error(JSON.stringify(org)); });
  assertBranded("OTP", { to: user.email, ...getOTPEmail(user, "123456", org) }, { nameInBody: false });

  console.log("\nadmin reset and provisioning");
  sent.length = 0;
  await callHandler(resetUserPassword, { params: { id: user.id }, user: { id: "regression-actor", role: "super_admin" } });
  assertBranded("admin reset", mailTo(user.email));
  const provEmail = `${RUN}_prov@${EMAIL_DOMAIN}`;
  await callHandler(provisionAdmin, { body: { name: "Prov Admin", email: provEmail, role: "mdrrmo_admin" }, user: { id: "regression-actor", role: "super_admin" } });
  const { rows: prov } = await pool.query(`SELECT id FROM "user" WHERE email = $1`, [provEmail]);
  if (prov[0]) created.userIds.push(prov[0].id);
  assertBranded("provisioning", mailTo(provEmail));

  console.log("\nsecurity alerts: password changed, recovered, new login (P3-03)");
  sent.length = 0;
  await securityService.handlePasswordChangeAlert(user);
  assertBranded("password changed", mailTo(user.email, /Password Changed/));
  await securityService.handlePasswordResetRecovery(user.email);
  assertBranded("recovered", mailTo(user.email, /Recovered/), { nameInBody: false });
  await pool.query(
    `INSERT INTO session (id, "expiresAt", token, "createdAt", "updatedAt", "ipAddress", "userAgent", "userId")
     VALUES ($1, NOW() + INTERVAL '1 hour', $2, NOW(), NOW(), '127.0.0.1', $3, $4)`,
    [`${user.id}_s1`, crypto.randomBytes(12).toString("hex"), "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0.0.0 Safari/537.36", user.id]
  );
  await securityService.handleNewDeviceLoginCheck(user.email);
  assertBranded("new login", mailTo(user.email, /New Login/), { nameInBody: false });

  console.log("\naccount notices");
  sent.length = 0;
  for (const kind of ["banned", "unbanned", "archived", "restored", "roleChanged"]) {
    await sendAccountNotice(user.id, kind, { reason: "test", fromRole: "resident", toRole: "barangay_admin" });
  }
  const notices = sent.filter((m) => m.to === user.email);
  check("five account notices captured", () => { if (notices.length !== 5) throw new Error(`${notices.length}`); });
  notices.forEach((m) => assertBranded(`notice "${m.subject}"`, m));

  console.log("\nrecertification reminder (P3-03, P5-16 left open)");
  sent.length = 0;
  const { rows: [mod] } = await pool.query(`INSERT INTO module_data (modname, modcat) VALUES ($1, 'General') RETURNING mod_id`, [`Module ${RUN}`]);
  created.modIds.push(mod.mod_id);
  const { rows: [act] } = await pool.query(
    `INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, 'completed', 100) RETURNING modact_id`,
    [user.id, mod.mod_id]
  );
  const { rows: [cert] } = await pool.query(
    `INSERT INTO certificates (user_id, modact_id, cert_rec, module_id, completion_date, verification_token, expires_at, status)
     VALUES ($1, $2, $3, $4, NOW(), $5, LOCALTIMESTAMP + INTERVAL '10 days', 'active') RETURNING cert_id`,
    [user.id, act.modact_id, `CERT-${RUN}`, mod.mod_id, crypto.randomUUID()]
  );
  created.certIds.push(cert.cert_id);
  await runCertificateMaintenanceJob();
  assertBranded("recert reminder", mailTo(user.email, /Expiring|Recertification/), { nameInBody: false });

  console.log("\nno support email, and a bad stored name");
  await putSetting("support_email", null);
  await putSetting("system_name", "Bad\r\nBcc: x@y.z");
  sent.length = 0;
  await auth.options.emailAndPassword.sendResetPassword({ user, token: "tok" });
  const plain = mailTo(user.email, /Reset/);
  check("no support email: no Reply-To", () => { if (plain.replyTo !== undefined) throw new Error(JSON.stringify(plain.replyTo)); });
  check("a stored name with CR/LF falls back to the default", () => {
    if (plain.subject !== "Reset Your Password - Bacolor Disaster LMS") throw new Error(plain.subject);
    if (plain.from.name !== "Bacolor Disaster LMS Security") throw new Error(JSON.stringify(plain.from));
  });
  // A bidi override stored by SQL or an older version must not reach a subject or sender name
  await putSetting("system_name", "Evil \u202Egnp.LMS");
  sent.length = 0;
  await auth.options.emailAndPassword.sendResetPassword({ user, token: "tok" });
  check("a stored name with a bidi override falls back to the default", () => {
    const m = mailTo(user.email, /Reset/);
    if (m.subject !== "Reset Your Password - Bacolor Disaster LMS") throw new Error(m.subject);
    if (/\u202E/.test(m.html + JSON.stringify(m.from))) throw new Error("U+202E reached the mail");
  });
  sent.length = 0;
  await sendAccountNotice(user.id, "banned", { reason: "x" });
  check("account notice contact line falls back to EMAIL_USER", () => {
    if (!mailTo(user.email).html.includes(`mailto:${EMAIL_USER}`)) throw new Error("no EMAIL_USER mailto");
  });
}

async function cleanup() {
  try {
    if (created.certIds.length) await pool.query(`DELETE FROM certificates WHERE cert_id = ANY($1)`, [created.certIds]);
    if (created.userIds.length) {
      await pool.query(`DELETE FROM user_notifications WHERE user_id = ANY($1)`, [created.userIds]).catch(() => {});
      await pool.query(`DELETE FROM user_known_devices WHERE user_id = ANY($1)`, [created.userIds]).catch(() => {});
      await pool.query(`DELETE FROM module_activity WHERE user_id = ANY($1)`, [created.userIds]);
      await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
      await pool.query(`DELETE FROM account WHERE "userId" = ANY($1)`, [created.userIds]);
      await pool.query(`DELETE FROM activity_log WHERE user_id = ANY($1)`, [created.userIds]).catch(() => {});
    }
    if (created.modIds.length) await pool.query(`DELETE FROM module_data WHERE mod_id = ANY($1)`, [created.modIds]);
    if (created.userIds.length) await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
    if (savedRows) {
      await pool.query("DELETE FROM system_settings WHERE key = ANY($1)", [SETTING_KEYS]);
      for (const { key, value } of savedRows) {
        await pool.query("INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW())", [key, value]);
      }
    }
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "user" WHERE id LIKE $1`, [`${RUN}%`]);
    console.log(`remaining fixture users: ${rows[0].n}`);
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
