const express = require('express');
const router = express.Router();
const noticeBoardController = require('../controllers/noticeBoardController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(noticeBoardController.getNotices)
  .post(authorize('admin', 'teacher'), noticeBoardController.createNotice);

router.route('/:id')
  .get(noticeBoardController.getNotice)
  .put(authorize('admin', 'teacher'), noticeBoardController.updateNotice)
  .delete(authorize('admin', 'teacher'), noticeBoardController.deleteNotice);

module.exports = router;

