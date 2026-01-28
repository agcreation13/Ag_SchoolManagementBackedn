const express = require('express');
const router = express.Router();
const {
  createTimetable,
  getTimetables,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  getTodaySchedule,
  getWeeklySchedule,
  getScheduleByClass,
  getScheduleByTeacher,
  getScheduleByStudent
} = require('../controllers/timetableController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .post(createTimetable)
  .get(getTimetables);

// Specific routes must come BEFORE parameterized routes
router.route('/today')
  .get(getTodaySchedule);

router.route('/weekly')
  .get(getWeeklySchedule);

router.route('/class/:classId')
  .get(getScheduleByClass);

router.route('/teacher/:teacherId')
  .get(getScheduleByTeacher);

router.route('/student/:studentId')
  .get(getScheduleByStudent);

// Parameterized route must come LAST
router.route('/:id')
  .get(getTimetableById)
  .put(updateTimetable)
  .delete(deleteTimetable);

module.exports = router;

