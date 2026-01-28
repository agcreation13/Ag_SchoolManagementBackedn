const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  createExamTimetable,
  getExamTimetables,
  updateExamTimetable,
  deleteExamTimetable,
  publishTimetable,
  getMarksSubmissions,
  getMarksSubmissionById,
  verifyMarksSubmission,
  publishResults,
  getPendingSubmissions,
  getLateSubmissions,
  getExamStatistics,
  exportMarksheet,
  getExamForms,
  getExamCalendar,
  getPerformanceCharts
} = require('../controllers/examCellController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/dashboard')
  .get(getDashboardStats);

router.route('/timetable')
  .post(createExamTimetable)
  .get(getExamTimetables);

router.route('/timetable/:id')
  .put(updateExamTimetable)
  .delete(deleteExamTimetable);

router.route('/timetable/:id/publish')
  .put(publishTimetable);

router.route('/marks-submissions')
  .get(getMarksSubmissions);

router.route('/marks-submissions/pending')
  .get(getPendingSubmissions);

router.route('/marks-submissions/late')
  .get(getLateSubmissions);

router.route('/marks-submissions/:id')
  .get(getMarksSubmissionById)
  .put(verifyMarksSubmission);

router.route('/results/publish')
  .post(publishResults);

router.route('/statistics')
  .get(getExamStatistics);

router.route('/export/marksheet')
  .get(exportMarksheet);

router.route('/forms')
  .get(getExamForms);

router.route('/calendar')
  .get(getExamCalendar);

router.route('/performance-charts')
  .get(getPerformanceCharts);

module.exports = router;

