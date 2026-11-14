/**
 * Regression test: GET /api/admin/health reports real runtime values, not placeholders.
 *
 *   1. node_version, platform, os_release come from the running process / OS
 *   2. cpu_load_percent is null on Windows (no load average), a number elsewhere
 *   3. smtp_status reflects a cached transporter.verify() result
 *   4. s3_configured is true only when the S3 credentials and bucket are all set
 *   5. config_missing lists the names (never values) of unset required variables
 *
 * Calls the service directly. The only query is SELECT 1. transporter.verify is
 * stubbed, so no mail server is contacted. Refuses to run unless the database
 * server is on a loopback address.
 *
 * Run from the repo root:  node server/tests/health-status.regression.cjs
 */
const assert = require("assert/strict");
const os = require("os");

const { transporter } = require("../utils/mailer");
let verifyResult = true;
transporter.verify = async () => {
  if (verifyResult !== true) throw new Error("stubbed SMTP failure");
  return true;
};

const pool = require("../config/db");
const service = require("../services/admin/SystemStatsService");

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`PASS  ${name}`);
  } catch (err) {
    results.push(false);
    console.log(`FAIL  ${name}\n      ${err.message.split("\n")[0]}`);
  }
}

async function main() {
  const { rows } = await pool.query("SELECT inet_server_addr()::text AS addr");
  if (rows[0].addr !== null && !/^(127\.|::1)/.test(rows[0].addr)) {
    throw new Error(`Refusing to run against a non-local database (${rows[0].addr}).`);
  }

  const health = await service.getHealthStatus();

  await check("1. runtime fields come from the process and OS", async () => {
    assert.equal(health.node_version, process.version);
    assert.equal(health.platform, os.platform());
    assert.equal(health.os_release, os.release());
  });

  await check("2. CPU load is null on Windows, a number elsewhere", async () => {
    if (process.platform === "win32") assert.equal(health.cpu_load_percent, null);
    else assert.equal(typeof health.cpu_load_percent, "number");
  });

  await check("3. smtp_status follows transporter.verify()", async () => {
    await service.refreshSmtpStatus();
    assert.equal((await service.getHealthStatus()).smtp_status, "connected");
    verifyResult = false;
    await service.refreshSmtpStatus();
    assert.equal((await service.getHealthStatus()).smtp_status, "error");
  });

  await check("4. s3_configured needs key, secret and bucket", async () => {
    const saved = {};
    const keys = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET_NAME"];
    for (const k of keys) saved[k] = process.env[k];
    try {
      for (const k of keys) process.env[k] = "x";
      assert.equal((await service.getHealthStatus()).s3_configured, true);
      delete process.env.AWS_S3_BUCKET_NAME;
      assert.equal((await service.getHealthStatus()).s3_configured, false);
    } finally {
      for (const k of keys) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
    }
  });

  await check("5. config_missing lists unset required names only", async () => {
    const saved = process.env.EMAIL_APP_PASSWORD;
    process.env.EMAIL_APP_PASSWORD = "";
    try {
      const { config_missing } = await service.getHealthStatus();
      assert.ok(Array.isArray(config_missing), "config_missing is not an array");
      assert.ok(config_missing.includes("EMAIL_APP_PASSWORD"));
      assert.ok(!config_missing.includes("DB_HOST"));
    } finally {
      process.env.EMAIL_APP_PASSWORD = saved;
    }
  });
}

main()
  .catch((err) => {
    console.error("setup error:", err.message);
    results.push(false);
  })
  .finally(async () => {
    await pool.end();
    const failed = results.filter((ok) => !ok).length;
    console.log(`\n${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  });
