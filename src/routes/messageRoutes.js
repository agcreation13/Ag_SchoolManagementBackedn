const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  getInbox,
  getSent,
  getConversation,
  markAsRead,
  markAllAsRead,
  replyToMessage,
  getUnreadCount
} = require('../controllers/messageController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .post(sendMessage)
  .get(getMessages);

router.route('/inbox')
  .get(getInbox);

router.route('/sent')
  .get(getSent);

router.route('/read-all')
  .put(markAllAsRead);

router.route('/unread-count')
  .get(getUnreadCount);

router.route('/conversation/:userId')
  .get(getConversation);

router.route('/:id')
  .get(getMessageById)
  .put(updateMessage)
  .delete(deleteMessage);

router.route('/:id/read')
  .put(markAsRead);

router.route('/:id/reply')
  .post(replyToMessage);

module.exports = router;

