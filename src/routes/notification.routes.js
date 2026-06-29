const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/notifications — List user notifications (paginated)
// Query params: page, limit, read (true|false)
router.get('/', notificationController.listNotifications);

// GET /api/notifications/unread-count — Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// PATCH /api/notifications/read-all — Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// PATCH /api/notifications/:id/read — Mark single notification as read
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
