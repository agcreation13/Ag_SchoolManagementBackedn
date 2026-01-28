const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, notificationController.getNotifications);
router.get('/:id', protect, notificationController.getNotification);
router.post('/', protect, authorize('admin', 'teacher'), notificationController.createNotification);
router.put('/:id', protect, authorize('admin', 'teacher'), notificationController.updateNotification);
router.put('/:id/read', protect, notificationController.markAsRead);
router.put('/read-all', protect, notificationController.markAllAsRead);
router.delete('/:id', protect, authorize('admin', 'teacher'), notificationController.deleteNotification);

module.exports = router;

