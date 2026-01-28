const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .get(gradeController.getGrades)
  .post(authorize('admin', 'teacher'), gradeController.createGrade);

router.route('/student/:studentId')
  .get(gradeController.getStudentGrades);

router.route('/class/:classId')
  .get(authorize('admin', 'teacher'), gradeController.getClassGrades);

router.route('/:id')
  .put(authorize('admin', 'teacher'), gradeController.updateGrade)
  .delete(authorize('admin'), gradeController.deleteGrade);

module.exports = router;

