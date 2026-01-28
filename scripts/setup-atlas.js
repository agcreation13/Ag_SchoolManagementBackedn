#!/usr/bin/env node

/**
 * MongoDB Atlas Setup Helper
 * Helps configure MongoDB Atlas connection
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupAtlas() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🌐 MongoDB Atlas Setup Helper');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    console.log('Please provide your MongoDB Atlas connection details:\n');

    const username = await question('Database Username: ');
    const password = await question('Database Password: ');
    const cluster = await question('Cluster Name (e.g., cluster0.xxxxx): ');
    const database = await question('Database Name [cms_db]: ') || 'cms_db';

    // URL encode password
    const encodedPassword = encodeURIComponent(password);

    // Build connection string
    const connectionString = `mongodb+srv://${username}:${encodedPassword}@${cluster}.mongodb.net/${database}?retryWrites=true&w=majority`;

    console.log('\n📋 Generated Connection String:');
    console.log(`   ${connectionString.replace(password, '***')}\n`);

    const confirm = await question('Update .env file with this connection string? (y/n): ');
    
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      const envPath = path.join(__dirname, '..', '.env');
      
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
      }

      // Update or add MONGODB_URI
      if (envContent.includes('MONGODB_URI=')) {
        envContent = envContent.replace(
          /MONGODB_URI=.*/g,
          `MONGODB_URI=${connectionString}`
        );
      } else {
        envContent += `\n# MongoDB Atlas Connection\nMONGODB_URI=${connectionString}\n`;
      }

      fs.writeFileSync(envPath, envContent);
      console.log('\n✅ .env file updated successfully!');
      console.log('\n📝 Next steps:');
      console.log('   1. Make sure your IP is whitelisted in MongoDB Atlas');
      console.log('   2. Run: npm run db:setup');
      console.log('   3. Test connection: npm run dev\n');
    } else {
      console.log('\n⚠️  Setup cancelled. Connection string not saved.');
      console.log('\nYou can manually add this to your .env file:');
      console.log(`MONGODB_URI=${connectionString}\n`);
    }

    rl.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

setupAtlas();

