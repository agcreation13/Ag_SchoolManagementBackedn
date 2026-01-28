#!/usr/bin/env node

/**
 * Setup .env file with default values
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

// Default .env content
const defaultEnv = `# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration - MongoDB Atlas (Cloud)
# Replace with your MongoDB Atlas connection string
# Format: mongodb+srv://username:password@cluster.mongodb.net/cms_db?retryWrites=true&w=majority
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/cms_db?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-${Date.now()}
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-refresh-token-secret-${Date.now()}
JWT_REFRESH_EXPIRE=30d

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
`;

try {
  if (fs.existsSync(envPath)) {
    // Read existing .env
    const existingEnv = fs.readFileSync(envPath, 'utf8');
    
    // Check if MONGODB_URI exists
    if (!existingEnv.includes('MONGODB_URI=')) {
      console.log('⚠️  MONGODB_URI not found in .env file');
      console.log('📝 Adding MongoDB Atlas connection string template...');
      
      // Add MongoDB Atlas connection string template
      const updatedEnv = existingEnv + '\n# Database Configuration - MongoDB Atlas\n# Replace with your actual MongoDB Atlas connection string\nMONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/cms_db?retryWrites=true&w=majority\n';
      fs.writeFileSync(envPath, updatedEnv);
      console.log('✅ MONGODB_URI template added to .env file');
      console.log('⚠️  Please update with your MongoDB Atlas connection string');
      console.log('💡 Run: npm run setup-atlas (for interactive setup)');
    } else {
      const hasAtlas = existingEnv.includes('mongodb+srv://');
      const hasLocal = existingEnv.includes('mongodb://localhost');
      const hasPlaceholder = existingEnv.includes('cluster0.xxxxx') || existingEnv.includes('username:password');
      
      if (hasPlaceholder) {
        console.log('⚠️  .env file has placeholder MongoDB Atlas connection string');
        console.log('💡 Please update with your actual Atlas connection string');
        console.log('💡 Run: npm run setup-atlas (for interactive setup)');
      } else if (hasAtlas) {
        console.log('✅ .env file configured for MongoDB Atlas');
      } else if (hasLocal) {
        console.log('⚠️  .env file is using local MongoDB');
        console.log('💡 To switch to MongoDB Atlas, run: npm run setup-atlas');
      } else {
        console.log('✅ .env file already has MONGODB_URI');
      }
    }
  } else {
    // Create new .env file
    console.log('📝 Creating .env file...');
    fs.writeFileSync(envPath, defaultEnv);
    console.log('✅ .env file created successfully');
  }
  
  console.log('\n📋 Current .env configuration:');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const mongoUri = envContent.match(/MONGODB_URI=(.+)/);
  if (mongoUri) {
    console.log(`   MONGODB_URI: ${mongoUri[1]}`);
  }
  
} catch (error) {
  console.error('❌ Error setting up .env file:', error.message);
  process.exit(1);
}

