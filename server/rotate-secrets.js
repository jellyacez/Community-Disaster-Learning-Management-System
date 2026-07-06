const { execSync } = require('child_process');


console.log('Starting local secret rotation...\n');

try {
  // Run the dotenvx rotation command
  console.log('Executing: npx @dotenvx/dotenvx ext keys rotate');
  execSync('npx --yes @dotenvx/dotenvx ext keys rotate', { stdio: 'inherit' });
  
  console.log('\n✅ Secret rotation successful!');
  console.log('================================================================');
  console.log('CRITICAL NEXT STEPS:');
  console.log('1. Open your .env.keys file and copy your new DOTENV_PRIVATE_KEY.');
  console.log('2. Log into your hosting provider (Vercel, Heroku, AWS, etc.).');
  console.log('3. Update the DOTENV_PRIVATE_KEY environment variable in their dashboard with the new value.');
  console.log('4. Commit and push these updated .env files to your repository.');
  console.log('5. Redeploy your server if it does not automatically redeploy on push.');
  console.log('================================================================\n');

} catch {
  console.error('\n❌ Failed to rotate secrets. Ensure you have npx installed and network access.');
  process.exit(1);
}
