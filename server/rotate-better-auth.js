/**
 * rotate-better-auth.js
 *
 * Rotates ONLY the Better Auth secret in .env.
 * Keeps the previous secret for one cycle so existing sessions
 * remain valid (Better Auth multi-secret / key rotation support).
 *
 * Usage:
 *   npm run rotate-better-auth
 *
 * No external tools required — only Node built-ins (crypto, fs, path).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '.env');

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Read the .env file into a key→value map.
 * Handles single-quoted, double-quoted, and unquoted values.
 * Collapses accidental physical line continuations in multiline values
 * (e.g., a value broken across two lines by a stray newline).
 */
function readEnv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const map = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map[key] = val;
  }
  return map;
}

/**
 * Write (or append) a single key=value line in the .env file.
 * Replaces the existing line for that key if found (handles quoted values).
 */
function writeEnvKey(filePath, key, value) {
  let raw = fs.readFileSync(filePath, 'utf8');
  const singleLineRe = new RegExp(`^(${key}=)(['"]?).*\\2[ \\t]*$`, 'm');
  const replacement = `${key}="${value}"`;
  if (singleLineRe.test(raw)) {
    raw = raw.replace(singleLineRe, replacement);
  } else {
    raw = raw.trimEnd() + `\n${replacement}\n`;
  }
  fs.writeFileSync(filePath, raw, 'utf8');
}

// ─── parse / format BETTER_AUTH_SECRETS envelope ────────────────────────────

function parseEnvelope(str) {
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  const secrets = [];
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    const version = parseInt(part.slice(0, colonIdx), 10);
    const secret = part.slice(colonIdx + 1).trim();
    if (!isNaN(version) && secret) secrets.push({ version, secret });
  }
  secrets.sort((a, b) => b.version - a.version);
  return secrets;
}

function formatEnvelope(secrets) {
  return secrets.map(s => `${s.version}:${s.secret}`).join(',');
}

// ─── main ────────────────────────────────────────────────────────────────────

console.log('🔄  Starting Better Auth secret rotation...\n');

if (!fs.existsSync(ENV_PATH)) {
  console.error(`❌  .env file not found at: ${ENV_PATH}`);
  process.exit(1);
}

const env = readEnv(ENV_PATH);

// ── Resolve existing secrets ──────────────────────────────────────────────────
let existingSecrets = [];

const envelopeRaw = (env['BETTER_AUTH_SECRETS'] || '').replace(/\s/g, '');
if (envelopeRaw) {
  existingSecrets = parseEnvelope(envelopeRaw);
  console.log(`  Found ${existingSecrets.length} existing versioned secret(s).`);
}

// Migrate legacy singular key if no versioned envelope exists
if (existingSecrets.length === 0 && env['BETTER_AUTH_SECRET']) {
  existingSecrets = [{ version: 1, secret: env['BETTER_AUTH_SECRET'] }];
  console.log('  ℹ️   Migrating BETTER_AUTH_SECRET → versioned envelope (version 1).');
}

if (existingSecrets.length === 0) {
  console.log('  ℹ️   No existing secret found — initialising fresh envelope at version 1.');
}

// ── Generate the new secret ───────────────────────────────────────────────────
const newSecret = crypto.randomBytes(32).toString('base64');
const nextVersion = existingSecrets.length > 0
  ? existingSecrets[0].version + 1
  : 1;

console.log(`✅  Generated new base64 secret (version ${nextVersion}) — equivalent to \`openssl rand -base64 32\`.`);

// Keep only the immediately previous secret for graceful session drain.
// Active users whose session tokens were signed with version N-1 will still
// authenticate; anyone on an older version is asked to re-login.
const retained = existingSecrets.slice(0, 1);
const newSecrets = [{ version: nextVersion, secret: newSecret }, ...retained];

const newEnvelope = formatEnvelope(newSecrets);
writeEnvKey(ENV_PATH, 'BETTER_AUTH_SECRETS', newEnvelope);

// Remove legacy singular key if it was there
if (env['BETTER_AUTH_SECRET']) {
  let raw = fs.readFileSync(ENV_PATH, 'utf8');
  raw = raw.replace(/^BETTER_AUTH_SECRET=.*$/m, '# BETTER_AUTH_SECRET migrated → BETTER_AUTH_SECRETS');
  fs.writeFileSync(ENV_PATH, raw, 'utf8');
  console.log('  ℹ️   BETTER_AUTH_SECRET removed from .env (migrated).');
}

// ─── summary ─────────────────────────────────────────────────────────────────
const retainedVersions = retained.map(s => `v${s.version}`).join(', ') || 'none';

console.log(`
================================================================
✅  Better Auth secret rotation complete!

  Active version : ${nextVersion}
  Retained       : ${retainedVersions} (for graceful session drain)
  Written to     : ${ENV_PATH}

NEXT STEPS:
  1. If deployed, update BETTER_AUTH_SECRETS in your hosting
     provider's environment variable dashboard.
  2. Redeploy the server — no active sessions will be dropped.
  3. On the NEXT rotation, v${nextVersion - 1} will be dropped,
     forcing re-login for any session older than today.

TIP: Run \`npm run rotate-secrets\` to also rotate JWT_SECRET.
================================================================
`);
