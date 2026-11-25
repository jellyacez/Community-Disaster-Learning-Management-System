/**
 * Regression test: the public branding cache (SystemSettingsService.getBranding, docs/specs/branding.md).
 *
 * A read that started before a save must not re-cache the old value after the save cleared the cache;
 * otherwise every visitor sees the old name and logo for up to 60 s (differential review of feat/branding).
 * The read's query is held open while the name changes and the cache is cleared, then released.
 *
 * Runs in-process, no API. Refuses non-loopback databases and LMS_db. Restores system_name.
 *
 * Run from the repo root:
 *   DB_DATABASE=<scratch> node server/tests/branding-cache.regression.cjs
 */
const pool = require("../config/db");
const svc = require("../services/admin/SystemSettingsService");

async function main() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const { db, addr } = rows[0];
  if (addr !== null && !/^(127\.|::1)/.test(addr)) throw new Error(`Refusing a non-local database (${addr}).`);
  if (db.toLowerCase() === "lms_db") throw new Error("Refusing LMS_db; use a scratch database.");

  const realQuery = pool.query.bind(pool);
  const { rows: saved } = await realQuery("SELECT value FROM system_settings WHERE key = 'system_name'");
  const original = saved[0]?.value ?? null;
  let failed = 0;
  try {
    svc.clearBrandingCache();
    let release;
    pool.query = (...args) => {
      if (/^SELECT key, value FROM public\.system_settings WHERE key IN \('system_name'/.test(String(args[0]))) {
        // Run the SELECT now (it sees the old name) but hand back its result only when released
        const result = realQuery(...args);
        return new Promise((resolve) => { release = () => resolve(result); });
      }
      return realQuery(...args);
    };
    const slowRead = svc.getBranding();
    while (!release) await new Promise((r) => setTimeout(r, 10));
    // The read has issued its SELECT; a save commits a new name and clears the cache...
    await realQuery("UPDATE system_settings SET value = 'Cache Race LMS' WHERE key = 'system_name'");
    svc.clearBrandingCache();
    // ...and only then does the old read, holding the old name, finish
    release();
    await slowRead;
    pool.query = realQuery;

    const after = await svc.getBranding();
    if (after.name === "Cache Race LMS") console.log("ok - a read that straddles a save does not re-cache the old value");
    else { failed++; console.log(`not ok - cached name after the save is ${JSON.stringify(after.name)}`); }
  } finally {
    pool.query = realQuery;
    if (original !== null) await realQuery("UPDATE system_settings SET value = $1 WHERE key = 'system_name'", [original]);
    svc.clearBrandingCache();
  }
  return failed;
}

main()
  .then((failed) => { console.log(failed ? "\n1 failed" : "\n1 passed"); return failed; })
  .catch((err) => { console.log(`ERROR ${err.stack}`); return 1; })
  .then(async (failed) => { await pool.end().catch(() => {}); process.exit(failed ? 1 : 0); });
