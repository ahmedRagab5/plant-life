const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const initSocket = require('./socket');
const startHealPlanReminder = require('./jobs/healPlanReminder');
const env = require('./config/env');

const startServer = async () => {
  // 1. Connect to MongoDB
  await connectDB();

  // 2. Create HTTP server from Express app
  const httpServer = http.createServer(app);

  // 3. Initialize Socket.IO
  const io = initSocket(httpServer);

  // Make io accessible in controllers via req.app.get('io')
  app.set('io', io);

  // 4. Start heal plan reminder cron job
  startHealPlanReminder(io);

  // 5. Start listening
  httpServer.listen(env.port, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║   🍅 Tomato Disease Classifier API                ║
║   📡 Server:    http://localhost:${env.port}            ║
║   🌍 Env:       ${env.nodeEnv.padEnd(33)}║
║   🔌 Socket.IO: Ready                            ║
║   ⏰ Cron:      Heal plan reminders active        ║
╚═══════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    httpServer.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
