const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.route('/')
  .get(classController.getClasses)
  .post(authorize('admin', 'teacher'), classController.createClass);

router.route('/:id')
  .get(classController.getClass)
  .put(authorize('admin', 'teacher'), classController.updateClass)
  .delete(authorize('admin'), classController.deleteClass);

router.route('/:id/students')
  .post(authorize('admin', 'teacher'), classController.addStudent);

router.route('/:id/students/:studentId')
  .delete(authorize('admin', 'teacher'), classController.removeStudent);

module.exports = router;

