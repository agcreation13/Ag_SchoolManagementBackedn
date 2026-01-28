const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // MongoDB Atlas connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    };

    // Additional options for MongoDB Atlas
    if (mongoURI.includes('mongodb+srv://')) {
      // MongoDB Atlas specific options
      options.serverSelectionTimeoutMS = 5000; // Timeout after 5s instead of 30s
      options.socketTimeoutMS = 45000; // Close sockets after 45s of inactivity
    }

    const conn = await mongoose.connect(mongoURI, options);

    const connectionType = mongoURI.includes('mongodb+srv://') ? 'MongoDB Atlas' : 'Local MongoDB';
    console.log(`✅ ${connectionType} Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error(`   Please check your MONGODB_URI in .env file`);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB error: ${err}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;
