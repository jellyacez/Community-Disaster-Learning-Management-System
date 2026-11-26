/**
 * Regression test: POST /api/modules/upload-media trusted the client's MIME type and the file
 * extension, never the bytes, and capped only the file size (validation audit M15). An HTML or
 * SVG file named .png with an image MIME type was stored in server/uploads and served from
 * /uploads.
 *
 * Sends real multipart requests (fetch + FormData/Blob) to a RUNNING LOCAL server that uses
 * disk storage (no AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY) and asserts:
 *   - what the module builder uploads still saves (201 + a /uploads URL, file on disk):
 *     PNG, JPEG, WEBP, GIF thumbnails/illustrations; PDF, DOCX, MP4, WebM, OGG step media
 *   - content that doesn't match its declared type is a 400 and leaves no new file:
 *     HTML as .png/image/png, SVG as image/svg+xml and as .png, an EXE or ZIP header as .pdf,
 *     a PNG body declared application/pdf, a PNG body named .pdf, an empty file
 *   - a text field next to the file, a second file and a file under another field name are a
 *     400 and leave no new file (the builder sends exactly one mediaFile part)
 *
 * Fixtures (user, session) are seeded in SQL and removed by exact id in `finally`; any file
 * the server stored for an accepted upload is deleted by name. Loopback databases only.
 *
 * Run from the repo root:  node server/tests/module-upload-media.regression.cjs
 * Optional: TEST_BASE_URL (default http://localhost:5000)
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const pool = require("../config/db");
const { auth } = require("../utils/auth");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";
const UA = "module-upload-media-regression/1.0";
const RUN = `regress_mum_${crypto.randomBytes(4).toString("hex")}`;
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

const created = { userIds: [], files: [] };

async function assertLocalDatabase() {
  const { rows } = await pool.query("SELECT current_database() AS db, inet_server_addr()::text AS addr");
  const addr = rows[0].addr;
  const isLoopback = addr === null || /^(127\.|::1)/.test(addr);
  console.log(`database: ${rows[0].db} @ ${addr ?? "unix socket"}`);
  if (!isLoopback) throw new Error(`Refusing to seed a non-local database (${addr}).`);
}

async function createUser(label, role) {
  const id = `${RUN}_${label}`;
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

const listUploads = () => new Set(fs.existsSync(UPLOAD_DIR) ? fs.readdirSync(UPLOAD_DIR) : []);

/** parts: [{ field, name, type, bytes }] for files, [{ field, value }] for text fields */
async function upload(user, parts) {
  const form = new FormData();
  for (const p of parts) {
    if (p.value !== undefined) form.append(p.field, p.value);
    else form.append(p.field, new Blob([p.bytes], { type: p.type }), p.name);
  }
  const before = listUploads();
  const res = await fetch(`${BASE_URL}/api/modules/upload-media`, {
    method: "POST",
    headers: { Accept: "application/json", "User-Agent": UA, Cookie: user.cookie },
    body: form,
  });
  const body = await res.json().catch(() => null);
  const added = [...listUploads()].filter((f) => !before.has(f));
  created.files.push(...added);
  return { status: res.status, body, added };
}

const pad = (head, n = 64) => Buffer.concat([Buffer.from(head), Buffer.alloc(n)]);
const ascii = (s) => [...Buffer.from(s, "latin1")];

const BYTES = {
  png: pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpeg: pad([0xff, 0xd8, 0xff, 0xe0]),
  webp: pad([...ascii("RIFF"), 0x24, 0, 0, 0, ...ascii("WEBPVP8 ")]),
  gif: pad(ascii("GIF89a")),
  pdf: pad(ascii("%PDF-1.7\n")),
  docx: pad([0x50, 0x4b, 0x03, 0x04]),
  mp4: pad([0, 0, 0, 0x18, ...ascii("ftypisom")]),
  webm: pad([0x1a, 0x45, 0xdf, 0xa3]),
  ogg: pad(ascii("OggS")),
  html: Buffer.from("<!DOCTYPE html><html><body><script>alert(document.cookie)</script></body></html>"),
  svg: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'),
  exe: pad(ascii("MZ")),
  zip: pad([0x50, 0x4b, 0x03, 0x04]),
};

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const VALID = [
  ["thumb.png", "image/png", BYTES.png],
  ["thumb.jpg", "image/jpeg", BYTES.jpeg],
  ["photo.jpeg", "image/jpeg", BYTES.jpeg],
  ["thumb.webp", "image/webp", BYTES.webp],
  ["thumb.gif", "image/gif", BYTES.gif],
  ["guide.pdf", "application/pdf", BYTES.pdf],
  ["guide.docx", DOCX_MIME, BYTES.docx],
  ["drill.mp4", "video/mp4", BYTES.mp4],
  ["drill.webm", "video/webm", BYTES.webm],
  ["drill.ogg", "video/ogg", BYTES.ogg],
];

const MISMATCHED = [
  ["HTML named .png sent as image/png", "evil.png", "image/png", BYTES.html],
  ["SVG sent as image/svg+xml", "evil.svg", "image/svg+xml", BYTES.svg],
  ["SVG named .png sent as image/png", "evil.png", "image/png", BYTES.svg],
  ["EXE header named .pdf sent as application/pdf", "evil.pdf", "application/pdf", BYTES.exe],
  ["ZIP header named .pdf sent as application/pdf", "evil.pdf", "application/pdf", BYTES.zip],
  ["PNG body named .pdf sent as application/pdf", "fake.pdf", "application/pdf", BYTES.png],
  ["PNG body named .png declared application/pdf", "thumb.png", "application/pdf", BYTES.png],
  ["HTML named .mp4 sent as video/mp4", "evil.mp4", "video/mp4", BYTES.html],
  ["empty file named .png", "empty.png", "image/png", Buffer.alloc(0)],
];

async function cleanup() {
  for (const f of created.files) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch { /* already gone */ }
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ids = created.userIds;
    await client.query("DELETE FROM activity_log WHERE user_id = ANY($1)", [ids]);
    await client.query(`DELETE FROM session WHERE "userId" = ANY($1)`, [ids]);
    await client.query(`DELETE FROM "user" WHERE id = ANY($1)`, [ids]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  await assertLocalDatabase();
  let failures = 0;
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (err) {
      failures++;
      console.log(`not ok - ${name}: ${err.message.split("\n")[0]}`);
    }
  };

  const author = await createUser("author", "mdrrmo_admin");

  for (const [name, type, bytes] of VALID) {
    await check(`builder upload ${name} (${type}) is stored`, async () => {
      const r = await upload(author, [{ field: "mediaFile", name, type, bytes }]);
      assert.equal(r.status, 201, `status ${r.status} ${JSON.stringify(r.body)}`);
      assert.equal(r.added.length, 1, `files added: ${r.added.join(", ")}`);
      assert.ok(r.body.url.endsWith(`/uploads/${r.added[0]}`), `url ${r.body.url}`);
      const stored = fs.readFileSync(path.join(UPLOAD_DIR, r.added[0]));
      assert.ok(stored.equals(bytes), "stored bytes differ from the upload");
    });
  }

  const refused = async (label, parts) =>
    check(`${label} -> 400, nothing stored`, async () => {
      const r = await upload(author, parts);
      assert.equal(r.status, 400, `status ${r.status} ${JSON.stringify(r.body)}`);
      assert.equal(r.body?.success, false);
      assert.equal(typeof r.body?.message, "string");
      assert.deepEqual(r.added, [], `files left in uploads: ${r.added.join(", ")}`);
    });

  for (const [label, name, type, bytes] of MISMATCHED) {
    await refused(label, [{ field: "mediaFile", name, type, bytes }]);
  }

  // Refusals of real files the old check let through (review S5): the toast the builder shows is
  // this message, so it must name the file, what it was expected to be, and what to do
  const explained = [
    ["a JPEG renamed .png", "photo.png", "image/png", BYTES.jpeg, /PNG image/],
    ["an MP4 without the ftyp box at the start", "drill.mp4", "video/mp4", pad([0, 0, 0, 0x18, ...ascii("mdat")]), /MP4 video/],
  ];
  for (const [label, name, type, bytes, kind] of explained) {
    await check(`${label} -> 400 whose message names the file, the expected type and the fix`, async () => {
      const r = await upload(author, [{ field: "mediaFile", name, type, bytes }]);
      assert.equal(r.status, 400, `status ${r.status} ${JSON.stringify(r.body)}`);
      assert.deepEqual(r.added, [], `files left in uploads: ${r.added.join(", ")}`);
      const message = r.body?.message || "";
      assert.ok(message.includes(name), `message doesn't name ${name}: ${message}`);
      assert.match(message, kind, `message doesn't say what the file should be: ${message}`);
      assert.match(message, /re-?export|rename/i, `message doesn't say how to fix it: ${message}`);
    });
  }

  await refused("text field before the file", [
    { field: "note", value: "x" },
    { field: "mediaFile", name: "thumb.png", type: "image/png", bytes: BYTES.png },
  ]);
  await refused("text field after the file", [
    { field: "mediaFile", name: "thumb.png", type: "image/png", bytes: BYTES.png },
    { field: "note", value: "x" },
  ]);
  await refused("two mediaFile parts", [
    { field: "mediaFile", name: "a.png", type: "image/png", bytes: BYTES.png },
    { field: "mediaFile", name: "b.png", type: "image/png", bytes: BYTES.png },
  ]);
  await refused("mediaFile plus a second file field", [
    { field: "mediaFile", name: "a.png", type: "image/png", bytes: BYTES.png },
    { field: "other", name: "b.png", type: "image/png", bytes: BYTES.png },
  ]);

  return failures;
}

main()
  .then((failures) => {
    if (failures) {
      console.log(`\n${failures} check(s) failed`);
      process.exitCode = 1;
    } else {
      console.log("\nall checks passed");
    }
  })
  .catch((err) => {
    console.error(err);
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
