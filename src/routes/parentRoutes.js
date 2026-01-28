const express = require('express');
const router = express.Router();
const {
  getChildren,
  getChildProfile,
  getChildAttendance,
  getChildGrades,
  getChildFees,
  getChildAssignments,
  getChildNotifications,
  getChildNotices,
  getChildFeeHistory,
  getChildAttendanceBreakdown,
  getChildAlerts,
  linkChild,
  unlinkChild
} = require('../controllers/parentController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/children')
  .get(getChildren)
  .post(linkChild);

router.route('/children/:studentId')
  .get(getChildProfile)
  .delete(unlinkChild);

router.route('/children/:studentId/attendance')
  .get(getChildAttendance);

router.route('/children/:studentId/grades')
  .get(getChildGrades);

router.route('/children/:studentId/fees')
  .get(getChildFees);

router.route('/children/:studentId/assignments')
  .get(getChildAssignments);

router.route('/children/:studentId/notifications')
  .get(getChildNotifications);

router.route('/children/:studentId/notices')
  .get(getChildNotices);

router.route('/children/:studentId/fees/history')
  .get(getChildFeeHistory);

router.route('/children/:studentId/attendance/breakdown')
  .get(getChildAttendanceBreakdown);

router.route('/children/:studentId/alerts')
  .get(getChildAlerts);

module.exports = router;

