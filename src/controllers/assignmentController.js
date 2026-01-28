const Assignment = require('../models/Assignment');
const Class = require('../models/Class');

// @desc    Get all assignments
// @route   GET /api/assignments
// @access  Private
exports.getAssignments = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let query = {};

    // Teachers see their assignments, Students see assignments for their classes
    if (role === 'teacher') {
      query.teacher = id;
    } else if (role === 'student') {
      const studentClasses = await Class.find({ students: id }).select('_id');
      query.class = { $in: studentClasses.map(c => c._id) };
    }

    const assignments = await Assignment.find(query)
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName email')
      .sort({ dueDate: 1 });

    res.json({
      success: true,
      count: assignments.length,
      data: assignments || []
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single assignment
// @route   GET /api/assignments/:id
// @access  Private
exports.getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('class', 'name code')
      .populate('teacher', 'firstName lastName email')
      .populate('submissions.student', 'firstName lastName email username');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create assignment
// @route   POST /api/assignments
// @access  Private (Teacher, Admin)
exports.createAssignment = async (req, res, next) => {
  try {
    req.body.teacher = req.user.id;
    const assignment = await Assignment.create(req.body);

    res.status(201).json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private (Teacher - own assignments, Admin)
exports.updateAssignment = async (req, res, next) => {
  try {
    let assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Teachers can only update their own assignments
    if (req.user.role === 'teacher' && assignment.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this assignment'
      });
    }

    assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('class', 'name code')
      .populate('teacher', 'firstName lastName email');

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private (Teacher - own assignments, Admin)
exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Teachers can only delete their own assignments
    if (req.user.role === 'teacher' && assignment.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this assignment'
      });
    }

    await assignment.deleteOne();

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Private (Student)
exports.submitAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    // Check if already submitted
    const existingSubmission = assignment.submissions.find(
      sub => sub.student.toString() === req.user.id
    );

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Assignment already submitted'
      });
    }

    const submission = {
      student: req.user.id,
      submittedAt: new Date(),
      content: req.body.content || '',
      files: req.body.files || [],
      status: new Date() > assignment.dueDate ? 'late' : 'submitted'
    };

    assignment.submissions.push(submission);
    await assignment.save();

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Grade assignment submission
// @route   PUT /api/assignments/:id/grade/:submissionId
// @access  Private (Teacher, Admin)
exports.gradeSubmission = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }

    const submission = assignment.submissions.id(req.params.submissionId);
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    submission.score = req.body.score;
    submission.feedback = req.body.feedback || '';
    submission.gradedAt = new Date();
    submission.status = 'graded';

    await assignment.save();

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    next(error);
  }
};

