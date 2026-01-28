const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .get(assignmentController.getAssignments)
  .post(authorize('admin', 'teacher'), assignmentController.createAssignment);

router.route('/:id')
  .get(assignmentController.getAssignment)
  .put(authorize('admin', 'teacher'), assignmentController.updateAssignment)
  .delete(authorize('admin', 'teacher'), assignmentController.deleteAssignment);

router.route('/:id/submit')
  .post(authorize('student'), assignmentController.submitAssignment);

router.route('/:id/grade/:submissionId')
  .put(authorize('admin', 'teacher'), assignmentController.gradeSubmission);

module.exports = router;

