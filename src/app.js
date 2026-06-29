const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');

// Route imports
const authRoutes = require('./routes/auth.routes');
const scanRoutes = require('./routes/scan.routes');
const healPlanRoutes = require('./routes/healPlan.routes');
const notificationRoutes = require('./routes/notification.routes');

// Middleware imports
const errorHandler = require('./middleware/error.middleware');
const ApiError = require('./utils/ApiError');

const app = express();

// ─── Security ───────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: '*', // Configure for production
  credentials: true,
}));

// ─── Body Parsing ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ────────────────────────────────────────────
if (env.isDev) {
  app.use(morgan('dev'));
}

// ─── Health Check ───────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Tomato Disease Classifier API is running 🍅',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
  });
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/heal-plans', healPlanRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── 404 Handler ────────────────────────────────────────
app.use((req, res, next) => {
  next(ApiError.notFound(`المسار غير موجود: ${req.originalUrl}`));
});

// ─── Global Error Handler ───────────────────────────────
app.use(errorHandler);

module.exports = app;
