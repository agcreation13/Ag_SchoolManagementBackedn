const Question = require('../models/Question');
const Exam = require('../models/Exam');

// @desc    Get all questions for an exam
// @route   GET /api/exams/:examId/questions
// @access  Private
exports.getQuestions = async (req, res, next) => {
  try {
    const questions = await Question.find({ examId: req.params.examId })
      .sort({ order: 1, createdAt: 1 });

    res.json({
      success: true,
      count: questions.length,
      data: questions
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single question
// @route   GET /api/questions/:id
// @access  Private
exports.getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create question
// @route   POST /api/exams/:examId/questions
// @access  Private
exports.createQuestion = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if user is the creator or admin
    if (exam.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add questions to this exam'
      });
    }

    const { questionText, type, options, correctAnswer, points, explanation, order } = req.body;

    // Validate question type specific requirements
    if (type === 'multiple_choice' && (!options || options.length < 2)) {
      return res.status(400).json({
        success: false,
        message: 'Multiple choice questions must have at least 2 options'
      });
    }

    if (type === 'true_false' && (!options || options.length !== 2)) {
      return res.status(400).json({
        success: false,
        message: 'True/False questions must have exactly 2 options'
      });
    }

    const question = await Question.create({
      examId: req.params.examId,
      questionText,
      type,
      options: options || [],
      correctAnswer,
      points: points || 1,
      explanation: explanation || '',
      order: order || 0
    });

    // Update exam's totalQuestions
    exam.totalQuestions = (exam.totalQuestions || 0) + 1;
    exam.questions.push(question._id);
    await exam.save();

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private
exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const exam = await Exam.findById(question.examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if user is the creator or admin
    if (exam.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this question'
      });
    }

    const { questionText, type, options, correctAnswer, points, explanation, order } = req.body;

    // Validate question type specific requirements
    if (type === 'multiple_choice' && (!options || options.length < 2)) {
      return res.status(400).json({
        success: false,
        message: 'Multiple choice questions must have at least 2 options'
      });
    }

    if (type === 'true_false' && (!options || options.length !== 2)) {
      return res.status(400).json({
        success: false,
        message: 'True/False questions must have exactly 2 options'
      });
    }

    if (questionText) question.questionText = questionText;
    if (type) question.type = type;
    if (options) question.options = options;
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer;
    if (points !== undefined) question.points = points;
    if (explanation !== undefined) question.explanation = explanation;
    if (order !== undefined) question.order = order;

    await question.save();

    res.json({
      success: true,
      data: question
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private
exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    const exam = await Exam.findById(question.examId);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Check if user is the creator or admin
    if (exam.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this question'
      });
    }

    // Remove question from exam
    exam.questions = exam.questions.filter(q => q.toString() !== question._id.toString());
    exam.totalQuestions = Math.max(0, (exam.totalQuestions || 0) - 1);
    await exam.save();

    // Delete question
    await question.deleteOne();

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

