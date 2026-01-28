const express = require('express');
const router = express.Router();
const attendanceCorrectionController = require('../controllers/attendanceCorrectionController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(attendanceCorrectionController.getAttendanceCorrections)
  .post(authorize('student'), attendanceCorrectionController.createAttendanceCorrection);

router.route('/:id/approve')
  .put(authorize('admin', 'teacher'), attendanceCorrectionController.approveCorrection);

router.route('/:id/reject')
  .put(authorize('admin', 'teacher'), attendanceCorrectionController.rejectCorrection);

module.exports = router;

