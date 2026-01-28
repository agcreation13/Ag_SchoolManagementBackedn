const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { protect, authorize } = require('../middleware/auth');

// View exams (all authenticated users)
router.get('/', protect, examController.getExams);
router.get('/:id', protect, examController.getExam);
router.get('/:id/results', protect, examController.getExamResults);

// Admin/Teacher only routes (create, update, delete exams)
router.post('/', protect, authorize('admin', 'teacher'), examController.createExam);
router.put('/:id', protect, authorize('admin', 'teacher'), examController.updateExam);
router.delete('/:id', protect, authorize('admin', 'teacher'), examController.deleteExam);

// Student routes (take exams - students can start and submit)
router.post('/:id/start', protect, examController.startExam);
router.post('/:id/submit', protect, examController.submitExam);

module.exports = router;

