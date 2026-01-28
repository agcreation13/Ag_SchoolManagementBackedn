const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const { protect, authorize } = require('../middleware/auth');

// Get all questions for an exam (students can view questions when taking exam)
router.get('/exams/:examId/questions', protect, questionController.getQuestions);

// Get single question
router.get('/:id', protect, questionController.getQuestion);

// Admin/Teacher only routes (create, update, delete questions)
router.post('/exams/:examId/questions', protect, authorize('admin', 'teacher'), questionController.createQuestion);
router.put('/:id', protect, authorize('admin', 'teacher'), questionController.updateQuestion);
router.delete('/:id', protect, authorize('admin', 'teacher'), questionController.deleteQuestion);

module.exports = router;

