const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notification.service');
const { StatusCodes } = require('http-status-codes');

/**
 * GET /api/notifications
 * List user notifications (paginated, latest first)
 */
const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.getUserNotifications(
    req.user._id,
    req.query
  );

  res.status(StatusCodes.OK).json({
    success: true,
    data: result,
  });
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);

  res.status(StatusCodes.OK).json({
    success: true,
    data: { unreadCount: count },
  });
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.params.id,
    req.user._id
  );

  res.status(StatusCodes.OK).json({
    success: true,
    data: { notification },
  });
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user._id);

  res.status(StatusCodes.OK).json({
    success: true,
    message: 'تم تعيين جميع الإشعارات كمقروءة',
  });
});

module.exports = { listNotifications, getUnreadCount, markAsRead, markAllAsRead };
