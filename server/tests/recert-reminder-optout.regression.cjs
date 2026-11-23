/**
 * Regression test (audit P5-16 / P3-05): the recertification reminder ignored the learner's
 * "Module Reminders" setting. Learners who turned it off in Settings still got the reminder
 * email and the in-app recert_reminder notification.
 *
 * The Settings label ("Get reminders for incomplete learning modules.") names no channel, so
 * opting out stops both. Disaster alerts are separate and stay locked on.
 *
 *   a) opted out (settings.reminders = false, written by UserService.updateUserSettings, the
 *      service behind PUT /api/users/me/settings): no email, no notification, the certificate
 *      is left unstamped
 *   b) opted in: exactly one email and one notification; a second run sends nothing more
 *   c) default (settings never changed, column default): prints the stored default and gets
 *      the reminder, as before
 *   d) legacy NULL settings: treated as opted in (getUserSettings' fallback), gets the reminder
 *   e) the opted-out learner turns reminders back on inside the window: reminded on the next run
 *
 * Runs in-process (no API needed) with the mailer stubbed: every mail is captured, none is
 * sent. The job processes every candidate in the database, so run it on a scratch database.
 * Fixtures are created per run and deleted by exact id. Refuses non-loopback databases and
 * LMS_db.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> node server/tests/recert-reminder-optout.regression.cjs
 */
const crypto = require("crypto");
const assert = require("assert/strict");

// Stub outgoing mail before anything that captures the transporter is loaded.
const { transporter } = require("../utils/mailer");
const sent = [];
transporter.sendMail = async (mail) => {
  sent.push(mail);
  return { stubbed: true };
};

const pool = require("../config/db");
const UserService = require("../services/users/UserService");
const { runCertificateMaintenanceJob } = require("../utils/certificateExpiryCron");

const RUN = `regress_ro_${crypto.randomBytes(4).toString("hex")}`;
const EMAIL_DOMAIN = `${RUN.replace(/_/g, "-")}.regression.invalid`;
const created = { userIds: [], modIds: [], certIds: [] };
let failed = 0;
let passed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`not ok - ${name}: ${err.message.split("\n")[0]}`);
  }
}

async function assertScratchDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  console.log(`database: ${db} @ ${addr ?? "unix socket"}`);
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");
}

// settingsSql: undefined = column default, "NULL" = legacy null, else a JSON literal
async function createLearner(label, settingsSql) {
  const id = `${RUN}_${label}`;
  const email = `${id}@${EMAIL_DOMAIN}`;
  const cols = settingsSql === undefined ? "" : ", settings";
  const vals = settingsSql === undefined ? "" : `, ${settingsSql === "NULL" ? "NULL" : "$3::jsonb"}`;
  const params = [id, email];
  if (settingsSql !== undefined && settingsSql !== "NULL") params.push(settingsSql);
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt"${cols})
     VALUES ($1, 'Regression ${label}', $2, true, 'resident', false, false, false, NOW(), NOW()${vals})`,
    params
  );
  created.userIds.push(id);
  return { id, email };
}

// An active certificate 10 days from expiry, not yet reminded
async function createCertificate(user, modId) {
  const { rows: [act] } = await pool.query(
    `INSERT INTO module_activity (user_id, mod_id, modstatus, progress) VALUES ($1, $2, 'Completed', 100) RETURNING modact_id`,
    [user.id, modId]
  );
  const { rows: [cert] } = await pool.query(
    `INSERT INTO certificates (user_id, modact_id, cert_rec, module_id, completion_date, verification_token, expires_at, status)
     VALUES ($1, $2, $3, $4, NOW(), $5, LOCALTIMESTAMP + INTERVAL '10 days', 'active') RETURNING cert_id`,
    [user.id, act.modact_id, `CERT-${RUN}-${created.certIds.length + 1}`, modId, crypto.randomUUID()]
  );
  created.certIds.push(cert.cert_id);
  return cert.cert_id;
}

const mailsTo = (user) => sent.filter((m) => m.to === user.email && /Recertification|Expir/i.test(m.subject));

async function remindersFor(user) {
  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS n FROM user_notification WHERE user_id = $1 AND type = 'recert_reminder'",
    [user.id]
  );
  return rows[0].n;
}

async function stampOf(certId) {
  const { rows } = await pool.query("SELECT recert_notified_at FROM certificates WHERE cert_id = $1", [certId]);
  return rows[0].recert_notified_at;
}

async function main() {
  await assertScratchDatabase();

  const { rows: [mod] } = await pool.query(
    `INSERT INTO module_data (modname, modcat, status) VALUES ($1, 'General', 'published') RETURNING mod_id`,
    [`${RUN} Recert Module`]
  );
  created.modIds.push(mod.mod_id);

  const optedOut = await createLearner("optedout", JSON.stringify({ announcements: true, reminders: true }));
  const optedIn = await createLearner("optedin", JSON.stringify({ announcements: true, reminders: true }));
  const byDefault = await createLearner("default");
  const legacyNull = await createLearner("legacynull", "NULL");

  // The learner turns Module Reminders off through the Settings service
  await UserService.updateUserSettings(optedOut.id, { reminders: false });

  const certOut = await createCertificate(optedOut, mod.mod_id);
  await createCertificate(optedIn, mod.mod_id);
  await createCertificate(byDefault, mod.mod_id);
  await createCertificate(legacyNull, mod.mod_id);

  const { rows: [def] } = await pool.query('SELECT settings FROM "user" WHERE id = $1', [byDefault.id]);
  console.log(`default settings for a learner who never changed them: ${JSON.stringify(def.settings)}`);

  sent.length = 0;
  await runCertificateMaintenanceJob();

  await check("a) opted out: no reminder email", async () => {
    assert.equal(mailsTo(optedOut).length, 0, `${mailsTo(optedOut).length} reminder emails`);
  });
  await check("a) opted out: no in-app recert_reminder notification", async () => {
    assert.equal(await remindersFor(optedOut), 0);
  });
  await check("a) opted out: certificate left unstamped", async () => {
    assert.equal(await stampOf(certOut), null);
  });
  await check("b) opted in: exactly one email and one notification", async () => {
    assert.equal(mailsTo(optedIn).length, 1, `${mailsTo(optedIn).length} emails`);
    assert.equal(await remindersFor(optedIn), 1);
  });
  await check("c) default settings: reminded (default is reminders on)", async () => {
    assert.equal(def.settings?.reminders, true, `stored default ${JSON.stringify(def.settings)}`);
    assert.equal(mailsTo(byDefault).length, 1, `${mailsTo(byDefault).length} emails`);
    assert.equal(await remindersFor(byDefault), 1);
  });
  await check("d) legacy NULL settings: reminded", async () => {
    assert.equal(mailsTo(legacyNull).length, 1, `${mailsTo(legacyNull).length} emails`);
    assert.equal(await remindersFor(legacyNull), 1);
  });

  // Second run: nothing more for anyone; then the opted-out learner turns reminders back on
  sent.length = 0;
  await runCertificateMaintenanceJob();
  await check("b) second run: no duplicate for the opted-in learner", async () => {
    assert.equal(mailsTo(optedIn).length, 0);
    assert.equal(await remindersFor(optedIn), 1);
  });
  await check("a) second run: still nothing for the opted-out learner", async () => {
    assert.equal(mailsTo(optedOut).length, 0);
  });

  await UserService.updateUserSettings(optedOut.id, { reminders: true });
  sent.length = 0;
  await runCertificateMaintenanceJob();
  await check("e) reminders turned back on: reminded once on the next run", async () => {
    assert.equal(mailsTo(optedOut).length, 1, `${mailsTo(optedOut).length} emails`);
    assert.equal(await remindersFor(optedOut), 1);
  });

  if (failed) throw new Error(`${failed} of ${passed + failed} checks failed`);
  console.log(`All ${passed} recert-reminder-optout regression checks passed.`);
}

async function cleanup() {
  const { userIds, modIds, certIds } = created;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM certificates WHERE cert_id = ANY($1)", [certIds]);
    await client.query("DELETE FROM module_activity WHERE user_id = ANY($1) OR mod_id = ANY($2)", [userIds, modIds]);
    await client.query("DELETE FROM user_notification WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [userIds]);
    await client.query("DELETE FROM module_data WHERE mod_id = ANY($1)", [modIds]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [userIds]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  const { rows } = await pool.query(
    `SELECT (SELECT COUNT(*)::int FROM "user" WHERE id = ANY($1)) AS users,
            (SELECT COUNT(*)::int FROM certificates WHERE cert_id = ANY($2)) AS certificates,
            (SELECT COUNT(*)::int FROM module_data WHERE mod_id = ANY($3)) AS modules,
            (SELECT COUNT(*)::int FROM user_notification WHERE user_id = ANY($1)) AS notifications`,
    [userIds, certIds, modIds]
  );
  console.log("cleanup counts:", JSON.stringify(rows[0]));
  assert.ok(Object.values(rows[0]).every((n) => n === 0), "cleanup left fixture rows behind");
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
