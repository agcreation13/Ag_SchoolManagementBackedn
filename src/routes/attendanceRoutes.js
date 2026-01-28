const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .get(attendanceController.getAttendance)
  .post(authorize('admin', 'teacher'), attendanceController.markAttendance);

router.route('/bulk')
  .post(authorize('admin', 'teacher'), attendanceController.markBulkAttendance);

router.route('/stats/:studentId')
  .get(attendanceController.getAttendanceStats);

router.route('/:id')
  .put(authorize('admin', 'teacher'), attendanceController.updateAttendance)
  .delete(authorize('admin'), attendanceController.deleteAttendance);

module.exports = router;

