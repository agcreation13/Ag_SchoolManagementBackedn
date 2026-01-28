const Exam = require('../models/Exam');
const Question = require('../models/Question');
const ExamAttempt = require('../models/ExamAttempt');
const { validationResult } = require('express-validator');

// @desc    Get all exams
// @route   GET /api/exams
// @access  Private
exports.getExams = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { isActive, createdBy } = req.query;
    const query = {};
    
    // Students can only see active exams assigned to their classes
    if (role === 'student') {
      query.isActive = true;
      // Students see exams for their classes
      const Class = require('../models/Class');
      const studentClasses = await Class.find({ students: id }).select('_id');
      if (studentClasses.length > 0) {
        query.class = { $in: studentClasses.map(c => c._id) };
      } else {
        // If student has no classes, return empty
        return res.json({
          success: true,
          count: 0,
          data: []
        });
      }
    } else if (role === 'teacher') {
      // Teachers see exams they created
      query.createdBy = id;
    }
    // Admin sees all exams
    
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (createdBy && role !== 'student') query.createdBy = createdBy;

    const exams = await Exam.find(query)
      .populate('createdBy', 'username firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single exam
// @route   GET /api/exams/:id
// @access  Private
exports.getExam = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const exam = await Exam.findById(req.params.id)
      .populate('createdBy', 'username firstName lastName')
      .populate('questions');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Students can only view active exams assigned to their classes
    if (role === 'student') {
      if (!exam.isActive) {
        return res.status(403).json({
          success: false,
          message: 'This exam is not available'
        });
      }
      // Check if student is in the class for this exam
      if (exam.class) {
        const Class = require('../models/Class');
        const classDoc = await Class.findById(exam.class);
        if (!classDoc || !classDoc.students.includes(id)) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to view this exam'
          });
        }
      }
    }

    res.json({
      success: true,
      data: exam
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create exam
// @route   POST /api/exams
// @access  Private (Admin, Teacher only)
exports.createExam = async (req, res, next) => {
  try {
    // Only admin and teacher can create exams
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create exams. Only admin and teachers can create exams.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { title, description, duration, questions, passingScore, startDate, endDate } = req.body;

    const exam = await Exam.create({
      title,
      description,
      duration,
      totalQuestions: questions ? questions.length : 0,
      questions: questions || [],
      passingScore: passingScore || 60,
      createdBy: req.user.id,
      startDate,
      endDate
    });

    // Create questions if provided
    if (questions && questions.length > 0) {
      const questionDocs = questions.map(q => ({
        ...q,
        examId: exam._id
      }));
      const createdQuestions = await Question.insertMany(questionDocs);
      exam.questions = createdQuestions.map(q => q._id);
      exam.totalQuestions = createdQuestions.length;
      await exam.save();
    }

    const populatedExam = await Exam.findById(exam._id)
      .populate('createdBy', 'username firstName lastName')
      .populate('questions');

    res.status(201).json({
      success: true,
      data: populatedExam
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start exam
// @route   POST /api/exams/:id/start
// @access  Private (Students only)
exports.startExam = async (req, res, next) => {
  // Only students can start exams
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can take exams'
    });
  }
  try {
    const exam = await Exam.findById(req.params.id).populate('questions');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    if (!exam.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Exam is not active'
      });
    }

    // Check if exam has time window
    const now = new Date();
    if (exam.startDate && now < exam.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Exam has not started yet'
      });
    }
    if (exam.endDate && now > exam.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Exam has ended'
      });
    }

    // Check for existing active attempt
    const existingAttempt = await ExamAttempt.findOne({
      exam: exam._id,
      user: req.user.id,
      submittedAt: null
    });

    if (existingAttempt) {
      return res.json({
        success: true,
        data: existingAttempt,
        message: 'Resuming existing exam attempt'
      });
    }

    // Create new attempt
    const attempt = await ExamAttempt.create({
      exam: exam._id,
      user: req.user.id,
      startedAt: new Date(),
      totalPoints: exam.questions.reduce((sum, q) => sum + (q.points || 1), 0)
    });

    res.status(201).json({
      success: true,
      data: attempt,
      exam: {
        id: exam._id,
        title: exam.title,
        duration: exam.duration,
        totalQuestions: exam.totalQuestions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit exam
// @route   POST /api/exams/:id/submit
// @access  Private (Students only)
exports.submitExam = async (req, res, next) => {
  // Only students can submit exams
  if (req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Only students can submit exams'
    });
  }
  try {
    const { answers } = req.body;

    const exam = await Exam.findById(req.params.id).populate('questions');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found'
      });
    }

    // Find active attempt
    let attempt = await ExamAttempt.findOne({
      exam: exam._id,
      user: req.user.id,
      submittedAt: null
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'No active exam attempt found'
      });
    }

    // Calculate score
    let score = 0;
    const answerArray = [];

    for (const answer of answers) {
      const question = exam.questions.find(q => q._id.toString() === answer.questionId);
      if (!question) continue;

      const isCorrect = question.correctAnswer.toLowerCase().trim() === answer.answer.toLowerCase().trim();
      if (isCorrect) {
        score += question.points || 1;
      }

      answerArray.push({
        questionId: question._id,
        answer: answer.answer,
        isCorrect
      });
    }

    const percentage = attempt.totalPoints > 0 ? (score / attempt.totalPoints) * 100 : 0;
    const isPassed = percentage >= exam.passingScore;
    const timeSpent = Math.floor((new Date() - attempt.startedAt) / 1000 / 60); // minutes

    // Update attempt
    attempt.answers = answerArray;
    attempt.score = score;
    attempt.percentage = percentage;
    attempt.isPassed = isPassed;
    attempt.timeSpent = timeSpent;
    attempt.submittedAt = new Date();
    await attempt.save();

    res.json({
      success: true,
      data: {
        score,
        totalPoints: attempt.totalPoints,
        percentage: percentage.toFixed(2),
        isPassed,
        timeSpent
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private
exports.updateExam = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let exam = await Exam.findById(req.params.id);

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
        message: 'Not authorized to update this exam'
      });
    }

    const { title, description, duration, questions, passingScore, startDate, endDate, isActive } = req.body;

    if (title) exam.title = title;
    if (description !== undefined) exam.description = description;
    if (duration) exam.duration = duration;
    if (passingScore !== undefined) exam.passingScore = passingScore;
    if (startDate !== undefined) exam.startDate = startDate;
    if (endDate !== undefined) exam.endDate = endDate;
    if (isActive !== undefined) exam.isActive = isActive;

    // Update questions if provided
    if (questions && Array.isArray(questions)) {
      // Delete old questions
      await Question.deleteMany({ examId: exam._id });
      
      // Create new questions
      const questionDocs = questions.map(q => ({
        ...q,
        examId: exam._id
      }));
      const createdQuestions = await Question.insertMany(questionDocs);
      exam.questions = createdQuestions.map(q => q._id);
      exam.totalQuestions = createdQuestions.length;
    }

    await exam.save();

    const populatedExam = await Exam.findById(exam._id)
      .populate('createdBy', 'username firstName lastName')
      .populate('questions');

    res.json({
      success: true,
      data: populatedExam
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private
exports.deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);

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
        message: 'Not authorized to delete this exam'
      });
    }

    // Delete related questions
    await Question.deleteMany({ examId: exam._id });
    
    // Delete related exam attempts
    await ExamAttempt.deleteMany({ exam: exam._id });

    // Delete exam
    await exam.deleteOne();

    res.json({
      success: true,
      message: 'Exam deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get exam results
// @route   GET /api/exams/:id/results
// @access  Private
exports.getExamResults = async (req, res, next) => {
  try {
    const attempts = await ExamAttempt.find({
      exam: req.params.id,
      user: req.user.id
    })
      .sort({ submittedAt: -1 });

    if (attempts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No exam attempts found'
      });
    }

    const exam = await Exam.findById(req.params.id).populate('questions');

    res.json({
      success: true,
      data: {
        exam: {
          id: exam._id,
          title: exam.title,
          passingScore: exam.passingScore
        },
        attempts: attempts.map(attempt => ({
          id: attempt._id,
          score: attempt.score,
          totalPoints: attempt.totalPoints,
          percentage: attempt.percentage,
          isPassed: attempt.isPassed,
          timeSpent: attempt.timeSpent,
          submittedAt: attempt.submittedAt,
          answers: attempt.answers
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

