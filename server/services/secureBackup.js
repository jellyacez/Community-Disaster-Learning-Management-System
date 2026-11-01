const crypto = require("node:crypto");
const AAD = Buffer.from("BACOLOR-LMS-BACKUP-V1");
const MAX = 64 * 1024 * 1024;
function key() {
  const hex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!/^[a-f0-9]{64}$/i.test(hex || ""))
    throw new Error(
      "Configure BACKUP_ENCRYPTION_KEY as 64 hexadecimal characters.",
    );
  return Buffer.from(hex, "hex");
}
function passwordCheck(password) {
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password) > 256
  )
    throw new Error("Use a backup password of 12–256 bytes.");
}
async function pack(dump, password) {
  passwordCheck(password);
  if (dump.length > MAX || dump.subarray(0, 5).toString() !== "PGDMP")
    throw new Error("Invalid or oversized PostgreSQL archive.");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([cipher.update(dump), cipher.final()]);
  const payload = Buffer.concat([AAD, iv, cipher.getAuthTag(), encrypted]);
  const { ZipWriter, Uint8ArrayWriter, Uint8ArrayReader } = await import(
    "@zip.js/zip.js"
  );
  const writer = new ZipWriter(new Uint8ArrayWriter(), {
    useWebWorkers: false,
  });
  await writer.add("database.backup.enc", new Uint8ArrayReader(payload), {
    password,
    encryptionStrength: 3,
    zipCrypto: false,
    level: 0,
  });
  return Buffer.from(await writer.close());
}
async function unpack(zip, password) {
  passwordCheck(password);
  if (zip.length > MAX + 1024 * 1024)
    throw new Error("Backup archive is too large.");
  const { ZipReader, Uint8ArrayReader, Uint8ArrayWriter } = await import(
    "@zip.js/zip.js"
  );
  const reader = new ZipReader(new Uint8ArrayReader(zip), {
    useWebWorkers: false,
  });
  try {
    const entries = await reader.getEntries();
    if (
      entries.length !== 1 ||
      entries[0].filename !== "database.backup.enc" ||
      !entries[0].encrypted ||
      entries[0].uncompressedSize > MAX + 128
    )
      throw new Error("Unsupported backup format.");
    // Stored entries only: the authenticated payload is already ciphertext, so compression is unnecessary.
    if (entries[0].compressionMethod !== 0)
      throw new Error("Unsupported backup compression.");
    const payload = Buffer.from(
      await entries[0].getData(new Uint8ArrayWriter(), {
        password,
        checkSignature: true,
      }),
    );
    if (
      payload.length < AAD.length + 28 ||
      !payload.subarray(0, AAD.length).equals(AAD)
    )
      throw new Error("Unsupported backup version.");
    const n = AAD.length;
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key(),
      payload.subarray(n, n + 12),
      { authTagLength: 16 },
    );
    decipher.setAAD(AAD);
    decipher.setAuthTag(payload.subarray(n + 12, n + 28));
    // No plaintext leaves this function until final() authenticates the entire payload.
    const dump = Buffer.concat([
      decipher.update(payload.subarray(n + 28)),
      decipher.final(),
    ]);
    if (dump.subarray(0, 5).toString() !== "PGDMP")
      throw new Error("Invalid database archive.");
    return dump;
  } finally {
    await reader.close();
  }
}
module.exports = { pack, unpack, passwordCheck, MAX };
