const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error(`❌ MongoDB runtime error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB disconnected. Attempting reconnection...');
  });
};

module.exports = connectDB;
