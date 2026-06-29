const Notification = require('../models/Notification');

/**
 * Create and persist a notification, then emit via Socket.IO if available.
 *
 * @param {object} data - Notification data
 * @param {string} data.user - User ID
 * @param {string} data.type - Notification type
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification message
 * @param {string} [data.healPlan] - HealPlan ID (optional)
 * @param {string} [data.scan] - Scan ID (optional)
 * @param {number} [data.taskIndex] - Task index (optional)
 * @param {object} [io] - Socket.IO instance (optional)
 * @returns {Promise<object>} Created notification
 */
const createNotification = async (data, io = null) => {
  const notification = await Notification.create(data);

  // Emit real-time notification via Socket.IO
  if (io) {
    io.to(`user:${data.user}`).emit('notification', {
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      healPlan: notification.healPlan,
      scan: notification.scan,
      taskIndex: notification.taskIndex,
      read: false,
      createdAt: notification.createdAt,
    });
  }

  return notification;
};

/**
 * Get paginated notifications for a user.
 */
const getUserNotifications = async (userId, { page = 1, limit = 20, read } = {}) => {
  const paginate = require('../utils/pagination');
  const filter = { user: userId };

  if (read !== undefined) {
    filter.read = read === 'true' || read === true;
  }

  const total = await Notification.countDocuments(filter);
  const paginationInfo = paginate({ page, limit }, total);

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip(paginationInfo.skip)
    .limit(paginationInfo.limit)
    .lean();

  return {
    notifications,
    pagination: {
      page: paginationInfo.page,
      limit: paginationInfo.limit,
      totalPages: paginationInfo.totalPages,
      total: paginationInfo.total,
    },
  };
};

/**
 * Mark a single notification as read.
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { read: true },
    { new: true }
  );

  if (!notification) {
    const ApiError = require('../utils/ApiError');
    throw ApiError.notFound('الإشعار غير موجود');
  }

  return notification;
};

/**
 * Mark all notifications as read for a user.
 */
const markAllAsRead = async (userId) => {
  await Notification.updateMany({ user: userId, read: false }, { read: true });
};

/**
 * Get unread notification count for a user.
 */
const getUnreadCount = async (userId) => {
  return Notification.countDocuments({ user: userId, read: false });
};

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
};
