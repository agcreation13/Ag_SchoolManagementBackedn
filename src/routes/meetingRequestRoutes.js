const express = require('express');
const router = express.Router();
const meetingRequestController = require('../controllers/meetingRequestController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(meetingRequestController.getMeetingRequests)
  .post(authorize('parent'), meetingRequestController.createMeetingRequest);

router.route('/:id/approve')
  .put(authorize('admin', 'teacher'), meetingRequestController.approveMeetingRequest);

router.route('/:id/schedule')
  .put(authorize('admin', 'teacher'), meetingRequestController.scheduleMeeting);

router.route('/:id/reject')
  .put(authorize('admin', 'teacher'), meetingRequestController.rejectMeetingRequest);

router.route('/:id/notes')
  .put(authorize('admin', 'teacher'), meetingRequestController.updateMeetingNotes);

module.exports = router;

