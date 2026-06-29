const { Server } = require('socket.io');
const { socketAuth } = require('../middleware/auth.middleware');
const { registerHandlers } = require('./handlers');

/**
 * Initialize Socket.IO server and attach to HTTP server.
 *
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server} io instance
 */
const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Configure for production
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Auth middleware — verify JWT before allowing connection
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.name} (${userId})`);

    // Join user to their personal room for targeted notifications
    socket.join(`user:${userId}`);

    // Register event handlers
    registerHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 User disconnected: ${socket.user.name} (${reason})`);
    });

    socket.on('error', (error) => {
      console.error(`🔌 Socket error for ${socket.user.name}:`, error.message);
    });
  });

  console.log('🔌 Socket.IO initialized');
  return io;
};

module.exports = initSocket;
