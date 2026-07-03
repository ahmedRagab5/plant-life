const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const env = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // MongoDB
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/tomato-classifier',

  // JWT
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Cloudinary
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,

  // AI Model
  aiModelUrl: process.env.AI_MODEL_URL || 'http://127.0.0.1:8000/analyze_tree',

  // Gemini Chatbot
  geminiApiKey: process.env.GEMINI_API_KEY,
};

// Validate required env vars
const required = ['jwtSecret', 'jwtRefreshSecret', 'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryApiSecret'];
const missing = required.filter((key) => !env[key]);

if (missing.length > 0 && env.nodeEnv !== 'test') {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

module.exports = env;
