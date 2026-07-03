const { execSync } = require('child_process');
const crypto = require('crypto');

console.log('🔄 Starting Better Auth secret rotation...');

try {
  // 1. Generate a new secure secret
  const newSecret = crypto.randomBytes(32).toString('hex');
  console.log('✅ Generated new secure 32-byte hex secret.');

  // 2. Fetch existing secrets using dotenvx (to decrypt them automatically)
  let currentSecretsStr = '';
  let legacySecret = '';

  try {
    currentSecretsStr = execSync('npx --yes @dotenvx/dotenvx get BETTER_AUTH_SECRETS', { encoding: 'utf8' }).trim();
  } catch (e) {
    // BETTER_AUTH_SECRETS might not exist yet
  }

  try {
    legacySecret = execSync('npx --yes @dotenvx/dotenvx get BETTER_AUTH_SECRET', { encoding: 'utf8' }).trim();
  } catch (e) {
    // BETTER_AUTH_SECRET might not exist
  }

  if (!currentSecretsStr && !legacySecret) {
    console.error('❌ Could not find BETTER_AUTH_SECRET or BETTER_AUTH_SECRETS in your .env file.');
    process.exit(1);
  }

  let nextVersion = 1;
  let newSecretsArray = [];

  // 3. Parse existing versioned secrets if they exist
  if (currentSecretsStr) {
    const parts = currentSecretsStr.split(',');
    for (const part of parts) {
      const [v, s] = part.split(':');
      const versionNum = parseInt(v, 10);
      if (!isNaN(versionNum)) {
        newSecretsArray.push({ version: versionNum, secret: s });
        if (versionNum >= nextVersion) {
          nextVersion = versionNum + 1;
        }
      }
    }
  } else if (legacySecret) {
    // Migrate from singular legacy secret to envelope format
    newSecretsArray.push({ version: 1, secret: legacySecret });
    nextVersion = 2;
  }

  // Add the new secret at the highest version
  newSecretsArray.unshift({ version: nextVersion, secret: newSecret });

  // Format the envelope string (e.g., 2:new,1:old)
  const envelopeString = newSecretsArray.map(s => `${s.version}:${s.secret}`).join(',');

  // 4. Update the .env file securely using dotenvx set
  console.log(`\nWriting new versioned secrets (Next Version: ${nextVersion})...`);
  execSync(`npx --yes @dotenvx/dotenvx set BETTER_AUTH_SECRETS "${envelopeString}"`, { stdio: 'inherit' });

  console.log('\n🎉 Successfully injected versioned secrets into .env!');
  console.log('================================================================');
  console.log('CRITICAL NEXT STEPS:');
  console.log('1. Run `npm run rotate-secrets` to lock your .env file up with new encryption keys.');
  console.log('2. Push this updated .env file to GitHub.');
  console.log('3. Redeploy your server.');
  console.log('Better Auth will instantly begin using Version', nextVersion, 'without dropping active sessions!');
  console.log('================================================================\n');

} catch (error) {
  console.error('\n❌ Failed to rotate Better Auth secrets.');
  console.error(error.message);
  process.exit(1);
}
