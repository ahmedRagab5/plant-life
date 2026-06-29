const Notification = require('../models/Notification');

/**
 * Register Socket.IO event handlers for a connected socket.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
const registerHandlers = (io, socket) => {
  const userId = socket.user._id.toString();

  /**
   * Mark a notification as read via socket event.
   * Payload: { notificationId: string }
   */
  socket.on('mark_notification_read', async ({ notificationId }) => {
    try {
      await Notification.findOneAndUpdate(
        { _id: notificationId, user: userId },
        { read: true }
      );
      socket.emit('notification_updated', { notificationId, read: true });
    } catch (error) {
      socket.emit('error_message', { message: 'فشل في تحديث الإشعار' });
    }
  });

  /**
   * Join a specific heal plan room (for plan-specific updates).
   * Payload: { healPlanId: string }
   */
  socket.on('join_heal_plan', ({ healPlanId }) => {
    socket.join(`healplan:${healPlanId}`);
  });

  /**
   * Leave a heal plan room.
   * Payload: { healPlanId: string }
   */
  socket.on('leave_heal_plan', ({ healPlanId }) => {
    socket.leave(`healplan:${healPlanId}`);
  });

  /**
   * Ping-pong for connection health check.
   */
  socket.on('ping_server', () => {
    socket.emit('pong_server', { timestamp: Date.now() });
  });
};

module.exports = { registerHandlers };
