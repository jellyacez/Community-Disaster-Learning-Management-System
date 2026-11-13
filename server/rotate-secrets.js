/**
 * Rotates JWT_SECRET and BETTER_AUTH_SECRETS in .env. The auth envelope keeps the previous
 * secret so current sessions drain gracefully; anything older is dropped.
 * Usage: npm run rotate-secrets
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.resolve(__dirname, '.env');


function readEnv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const map = {};
  // rejoin values split across lines by a stray newline
  const normalized = raw.replace(/\r\n/g, '\n');
  for (const line of normalized.split('\n')) {
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

function writeEnvKey(filePath, key, value) {
  let raw = fs.readFileSync(filePath, 'utf8');

  const singleLineRe = new RegExp(
    `^(${key}=)(['"]?).*\\2[ \\t]*$`,
    'm'
  );

  const replacement = `${key}="${value}"`;

  if (singleLineRe.test(raw)) {
    raw = raw.replace(singleLineRe, replacement);
  } else {
    raw = raw.trimEnd() + `\n${replacement}\n`;
  }

  fs.writeFileSync(filePath, raw, 'utf8');
}


function parseEnvelope(str) {
  // Format: "VERSION:SECRET,VERSION:SECRET" — tolerates spaces around commas
  const parts = str.split(',').map(s => s.trim()).filter(Boolean);
  const secrets = [];
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    const version = parseInt(part.slice(0, colonIdx), 10);
    const secret = part.slice(colonIdx + 1).trim();
    if (!isNaN(version) && secret) {
      secrets.push({ version, secret });
    }
  }
  secrets.sort((a, b) => b.version - a.version);
  return secrets;
}

function formatEnvelope(secrets) {
  return secrets.map(s => `${s.version}:${s.secret}`).join(',');
}


console.log('🔄  Starting secret rotation...\n');

if (!fs.existsSync(ENV_PATH)) {
  console.error(`❌  .env file not found at: ${ENV_PATH}`);
  process.exit(1);
}

const env = readEnv(ENV_PATH);

const newJwtSecret = crypto.randomBytes(64).toString('hex');
writeEnvKey(ENV_PATH, 'JWT_SECRET', newJwtSecret);
console.log('✅  JWT_SECRET rotated (128-char hex).');

const newAuthSecret = crypto.randomBytes(32).toString('base64');

let existingSecrets = [];

const envelopeRaw = (env['BETTER_AUTH_SECRETS'] || '').replace(/\s/g, '');
if (envelopeRaw) {
  existingSecrets = parseEnvelope(envelopeRaw);
}

// fall back to the legacy singular BETTER_AUTH_SECRET
if (existingSecrets.length === 0 && env['BETTER_AUTH_SECRET']) {
  existingSecrets = [{ version: 1, secret: env['BETTER_AUTH_SECRET'] }];
  console.log('  ℹ️   Migrating legacy BETTER_AUTH_SECRET → versioned envelope.');
}

const nextVersion = existingSecrets.length > 0
  ? existingSecrets[0].version + 1
  : 1;

// keep only the previous secret so current sessions drain
const retained = existingSecrets.slice(0, 1);
const newSecrets = [
  { version: nextVersion, secret: newAuthSecret },
  ...retained,
];

const newEnvelope = formatEnvelope(newSecrets);
writeEnvKey(ENV_PATH, 'BETTER_AUTH_SECRETS', newEnvelope);

if (env['BETTER_AUTH_SECRET']) {
  let raw = fs.readFileSync(ENV_PATH, 'utf8');
  raw = raw.replace(/^BETTER_AUTH_SECRET=.*$/m, '# BETTER_AUTH_SECRET migrated to BETTER_AUTH_SECRETS');
  fs.writeFileSync(ENV_PATH, raw, 'utf8');
  console.log('  ℹ️   BETTER_AUTH_SECRET removed (migrated).');
}

console.log(`✅  BETTER_AUTH_SECRETS rotated — active version: ${nextVersion} (previous kept for drain).`);

console.log(`
================================================================
✅  Secret rotation complete!

New secrets written to: ${ENV_PATH}

NEXT STEPS (if deployed):
  1. Copy the new values from .env to your hosting provider's
     environment variable dashboard (Vercel / Railway / Heroku).
  2. Redeploy the server.
  3. Existing user sessions remain valid until the retained
     previous secret is removed on the NEXT rotation.
================================================================
`);
