/**
 * Regression test: an upload-media request aborted mid-body left a partial file in server/uploads
 * and leaked one open handle per abort (review F1 of fix/input-robustness, introduced by the M15
 * sniffing wrapper). The wrapper handed disk storage a copy of multer's file object, so multer's
 * abort cleanup never saw the file's path, and `src.pipe(body)` never ended the PassThrough when
 * the request was cut off, so the write stream stayed open.
 *
 * Opens raw sockets to a RUNNING LOCAL server that uses disk storage (no AWS keys), sends a
 * multipart header that promises 5 MB, sends part of the file and drops the connection:
 *   - after a valid PNG header and 256 KB of body (past the 12-byte sniff, so disk storage has
 *     opened the file), 5 times
 *   - inside the first 12 bytes (during the sniff), 5 times
 * and asserts no new file is left in server/uploads. When TEST_SERVER_PID is set (the
 * scratch/batch3a tools/run-test.sh runner sets it from server.pid) it also asserts the server's
 * open-handle count doesn't grow with the aborts (it grew by one per abort before the fix).
 *
 * Fixtures (user, session) are seeded in SQL and removed by exact id in `finally`; any file the
 * server left is deleted by name. Loopback databases only.
 *
 * Run from the repo root:  node server/tests/upload-abort.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000), TEST_SERVER_PID
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const net = require("net");
const { execFileSync } = require("child_process");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = new URL(process.env.TEST_BASE_URL || "http://localhost:5000");
const SERVER_PID = process.env.TEST_SERVER_PID ? Number(process.env.TEST_SERVER_PID) : null;
const UA = "upload-abort-regression/1.0";
const RUN = `regress_ua_${crypto.randomBytes(4).toString("hex")}`;
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const ABORTS = 5;

const created = { userIds: [], leftovers: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const listUploads = () => new Set(fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : []);

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createAuthor() {
  const id = `${RUN}_author`;
  await pool.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "twoFactorEnabled", archived, banned, "createdAt", "updatedAt")
     VALUES ($1, 'Regression author', $2, true, 'mdrrmo_admin', true, false, false, NOW(), NOW())`,
    [id, `${id}@regression.invalid`]
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
  return `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}`;
}

/** Open handles of the server process (Windows: HandleCount; Linux: /proc/<pid>/fd). */
function handleCount(pid) {
  if (process.platform === "win32") {
    const out = execFileSync("powershell", ["-NoProfile", "-Command", `(Get-Process -Id ${pid}).HandleCount`], { encoding: "utf8" });
    return Number(out.trim());
  }
  return fs.readdirSync(`/proc/${pid}/fd`).length;
}

/** Sends a multipart header promising 5 MB, then `body`, then drops the connection. */
async function abortedUpload(cookie, body) {
  const boundary = `----${RUN}${crypto.randomBytes(4).toString("hex")}`;
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="mediaFile"; filename="${RUN}.png"\r\nContent-Type: image/png\r\n\r\n`
  );
  const sock = net.connect(Number(BASE_URL.port), BASE_URL.hostname === "localhost" ? "127.0.0.1" : BASE_URL.hostname);
  sock.on("error", () => {});
  await new Promise((r) => sock.once("connect", r));
  sock.write(
    `POST /api/modules/upload-media HTTP/1.1\r\nHost: ${BASE_URL.host}\r\nUser-Agent: ${UA}\r\nCookie: ${cookie}\r\n` +
      `Accept: application/json\r\nContent-Type: multipart/form-data; boundary=${boundary}\r\n` +
      `Content-Length: ${head.length + 5 * 1024 * 1024}\r\n\r\n`
  );
  sock.write(head);
  sock.write(body);
  await sleep(500);
  sock.destroy();
}

const PNG_SIG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");

async function run() {
  await assertLocalDatabase();
  const cookie = await createAuthor();
  let failures = 0;
  const check = async (label, body) => {
    const before = listUploads();
    const handlesBefore = SERVER_PID ? handleCount(SERVER_PID) : null;
    for (let i = 0; i < ABORTS; i++) await abortedUpload(cookie, body);
    await sleep(2000);
    const left = [...listUploads()].filter((f) => !before.has(f));
    created.leftovers.push(...left);
    const handlesAfter = SERVER_PID ? handleCount(SERVER_PID) : null;
    const problems = [];
    if (left.length) problems.push(`${left.length} file(s) left in server/uploads: ${left.join(", ")}`);
    // One leaked handle per abort before the fix; allow a little noise, not one per abort
    if (SERVER_PID && handlesAfter - handlesBefore >= 3) {
      problems.push(`server handles went ${handlesBefore} -> ${handlesAfter} over ${ABORTS} aborts`);
    }
    if (problems.length) {
      failures++;
      console.log(`not ok - ${label}: ${problems.join("; ")}`);
    } else {
      console.log(`ok - ${label}: ${ABORTS} aborts leave no file${SERVER_PID ? ` and no handle growth (${handlesBefore} -> ${handlesAfter})` : ""}`);
    }
  };

  if (!SERVER_PID) console.log("note: TEST_SERVER_PID not set; the open-handle check is skipped");
  await check("abort after the PNG header and 256 KB (past the sniff)", Buffer.concat([PNG_SIG, Buffer.alloc(256 * 1024, 0x41)]));
  await check("abort inside the first 12 bytes (during the sniff)", PNG_SIG.subarray(0, 6));

  if (failures) throw new Error(`${failures} check(s) failed`);
  console.log("All upload abort regression checks passed.");
}

run()
  .catch((err) => {
    console.error(`FAILED: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const f of created.leftovers) {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch { /* already gone */ }
    }
    await pool.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [created.userIds]);
    const { rowCount } = await pool.query(`DELETE FROM "user" WHERE id = ANY($1)`, [created.userIds]);
    console.log(`cleanup: ${rowCount} fixture users, ${created.leftovers.length} leftover files removed`);
    await pool.end();
  });
